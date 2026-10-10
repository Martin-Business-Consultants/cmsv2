import { createReadStream } from 'node:fs'
import { open } from 'node:fs/promises'
import { createInflateRaw } from 'node:zlib'
import type { Readable } from 'node:stream'

export type ArchiveEntry = {
  name: string
  method: number
  compressedSize: number
  size: number
  offset: number
  encrypted: boolean
  directory: boolean
}

export class ArchiveError extends Error {}

const END_OF_DIRECTORY = 0x06054b50
const DIRECTORY_ENTRY = 0x02014b50
const LOCAL_HEADER = 0x04034b50
const STORED = 0
const DEFLATED = 8

export async function readArchive(path: string): Promise<ArchiveEntry[]> {
  const handle = await open(path)
  try {
    const { size } = await handle.stat()
    const tailLength = Math.min(size, 22 + 0xffff)
    const tail = Buffer.alloc(tailLength)
    await handle.read(tail, 0, tailLength, size - tailLength)
    let end = -1
    for (let index = tailLength - 22; index >= 0; index--) {
      if (tail.readUInt32LE(index) === END_OF_DIRECTORY) {
        end = index
        break
      }
    }
    if (end < 0) throw new ArchiveError('isn’t a zip archive')
    const count = tail.readUInt16LE(end + 10)
    const directorySize = tail.readUInt32LE(end + 12)
    const directoryOffset = tail.readUInt32LE(end + 16)
    if (count === 0xffff || directoryOffset === 0xffffffff) {
      throw new ArchiveError('is a Zip64 archive; split it into smaller zips')
    }
    const directory = Buffer.alloc(directorySize)
    await handle.read(directory, 0, directorySize, directoryOffset)

    const entries: ArchiveEntry[] = []
    let cursor = 0
    for (let index = 0; index < count; index++) {
      if (directory.readUInt32LE(cursor) !== DIRECTORY_ENTRY) {
        throw new ArchiveError('is damaged')
      }
      const flags = directory.readUInt16LE(cursor + 8)
      const nameLength = directory.readUInt16LE(cursor + 28)
      const extraLength = directory.readUInt16LE(cursor + 30)
      const commentLength = directory.readUInt16LE(cursor + 32)
      const name = directory.toString('utf8', cursor + 46, cursor + 46 + nameLength)
      entries.push({
        name,
        method: directory.readUInt16LE(cursor + 10),
        compressedSize: directory.readUInt32LE(cursor + 20),
        size: directory.readUInt32LE(cursor + 24),
        offset: directory.readUInt32LE(cursor + 42),
        encrypted: Boolean(flags & 1),
        directory: name.endsWith('/'),
      })
      cursor += 46 + nameLength + extraLength + commentLength
    }
    return entries
  } finally {
    await handle.close()
  }
}

export async function extractEntry(path: string, entry: ArchiveEntry, maxBytes: number) {
  if (entry.encrypted) throw new ArchiveError('is encrypted')
  if (entry.method !== STORED && entry.method !== DEFLATED) {
    throw new ArchiveError('uses an unsupported compression method')
  }
  if (entry.size > maxBytes) throw new ArchiveError('is too large')
  if (entry.compressedSize === 0) return Buffer.alloc(0)

  const handle = await open(path)
  const header = Buffer.alloc(30)
  try {
    await handle.read(header, 0, 30, entry.offset)
  } finally {
    await handle.close()
  }
  if (header.readUInt32LE(0) !== LOCAL_HEADER) throw new ArchiveError('is damaged')
  const start = entry.offset + 30 + header.readUInt16LE(26) + header.readUInt16LE(28)
  const raw = createReadStream(path, { start, end: start + entry.compressedSize - 1 })
  const source: Readable = entry.method === STORED ? raw : raw.pipe(createInflateRaw())

  const chunks: Buffer[] = []
  let total = 0
  for await (const chunk of source) {
    total += chunk.length
    if (total > maxBytes) {
      raw.destroy()
      throw new ArchiveError('is too large')
    }
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}
