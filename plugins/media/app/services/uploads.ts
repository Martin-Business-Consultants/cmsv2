import { randomUUID } from 'node:crypto'
import { createWriteStream } from 'node:fs'
import { mkdir, readFile, rm } from 'node:fs/promises'
import { Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import app from '@adonisjs/core/services/app'
import type { HttpContext } from '@adonisjs/core/http'
import { UploadError } from './media.js'

export type ReceivedFile = {
  path: string
  size: number
  read: () => Promise<Buffer>
  discard: () => Promise<void>
}

export async function receiveUpload(request: HttpContext['request'], maxBytes: number) {
  const declared = Number(request.header('content-length') ?? 0)
  if (declared > maxBytes) throw new UploadError(`is larger than ${formatLimit(maxBytes)}`)
  const directory = app.tmpPath('media-uploads')
  await mkdir(directory, { recursive: true })
  const path = `${directory}/${randomUUID()}`
  let size = 0
  const limit = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      size += chunk.length
      if (size > maxBytes) callback(new UploadError(`is larger than ${formatLimit(maxBytes)}`))
      else callback(null, chunk)
    },
  })
  try {
    await pipeline(request.request, limit, createWriteStream(path))
  } catch (error) {
    await rm(path, { force: true })
    throw error
  }
  if (size === 0) {
    await rm(path, { force: true })
    throw new UploadError('is empty')
  }
  return {
    path,
    size,
    read: () => readFile(path),
    discard: () => rm(path, { force: true }),
  } satisfies ReceivedFile
}

function formatLimit(bytes: number) {
  return bytes >= 1024 ** 3 ? `${bytes / 1024 ** 3} GB` : `${bytes / 1024 ** 2} MB`
}
