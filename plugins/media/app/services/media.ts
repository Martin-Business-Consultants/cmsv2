import { randomBytes } from 'node:crypto'
import { basename, dirname, extname } from 'node:path'
import drive from '@adonisjs/drive/services/main'
import sharp from 'sharp'
import { DateTime } from 'luxon'
import Asset from '../models/asset.js'
import { ROOT, ensureFolder, joinFolder, normalizeFolder } from './folders.js'
import { extractEntry, readArchive } from './archive.js'
import type { AssetVariant } from '#types/content'

export const LIMITS = {
  fileBytes: 50 * 1024 * 1024,
  imagePixels: 100_000_000,
  archiveBytes: 2 * 1024 * 1024 * 1024,
  archiveFiles: 2000,
}

export const MIME_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
  svg: 'image/svg+xml',
  pdf: 'application/pdf',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  odt: 'application/vnd.oasis.opendocument.text',
  ods: 'application/vnd.oasis.opendocument.spreadsheet',
  txt: 'text/plain',
  csv: 'text/csv',
  zip: 'application/zip',
}

export const UPLOAD_EXTNAMES = Object.keys(MIME_TYPES)

const RASTER = new Set(['jpg', 'jpeg', 'png', 'webp', 'avif'])
const MEASURED = new Set([...RASTER, 'gif', 'svg'])
const VARIANT_WIDTHS = [640, 1280, 1920]

export class UploadError extends Error {}

export type FileInput = { buffer: Buffer; filename: string }

export type ArchiveProgress = { processed: number; total: number }

export type ArchiveResult = {
  folder: string
  assets: Asset[]
  failures: string[]
  skipped: number
}

export type AssetDetails = {
  title?: string | null
  alt?: string | null
  caption?: string | null
  description?: string | null
  focalX?: number
  focalY?: number
  folder?: string
}

export function extensionOf(filename: string) {
  return extname(filename).slice(1).toLowerCase()
}

export function isArchive(filename: string) {
  return extensionOf(filename) === 'zip'
}

export function titleFrom(filename: string) {
  return basename(filename, extname(filename)).replace(/[-_]+/g, ' ').trim() || filename
}

function safeFilename(name: string) {
  const ext = extname(name).toLowerCase()
  const base = name
    .slice(0, name.length - ext.length)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
  return `${base || 'file'}${ext}`
}

function newKey(filename: string) {
  const month = DateTime.now().toFormat('yyyy/LL')
  return `${month}/${randomBytes(6).toString('hex')}-${safeFilename(filename)}`
}

function check({ buffer, filename }: FileInput) {
  const ext = extensionOf(filename)
  if (!MIME_TYPES[ext]) throw new UploadError(`is a file type that isn’t allowed`)
  if (buffer.length > LIMITS.fileBytes) throw new UploadError('is larger than 50 MB')
  return ext
}

async function measure(buffer: Buffer, ext: string) {
  if (!MEASURED.has(ext)) return { width: null, height: null }
  try {
    const meta = await sharp(buffer, { limitInputPixels: false }).metadata()
    const width = meta.autoOrient?.width ?? meta.width ?? null
    const height = meta.autoOrient?.height ?? meta.height ?? null
    if (width && height && width * height > LIMITS.imagePixels) {
      throw new UploadError('is larger than 100 megapixels')
    }
    return { width, height }
  } catch (error) {
    if (error instanceof UploadError) throw error
    if (RASTER.has(ext)) throw new UploadError('isn’t a readable image')
    return { width: null, height: null }
  }
}

async function writeFile(key: string, buffer: Buffer, ext: string, width: number | null) {
  const disk = drive.use()
  await disk.put(key, buffer, { contentType: MIME_TYPES[ext] })
  const variants: AssetVariant[] = []
  if (!RASTER.has(ext) || !width) return variants
  const stem = key.slice(0, key.length - extname(key).length)
  for (const target of VARIANT_WIDTHS.filter((size) => size < width)) {
    const variantKey = `${stem}-w${target}.webp`
    const output = await sharp(buffer).autoOrient().resize({ width: target }).webp().toBuffer()
    await disk.put(variantKey, output, { contentType: 'image/webp' })
    variants.push({ width: target, key: variantKey })
  }
  return variants
}

export async function storeFile(input: FileInput, folder: string = ROOT) {
  const ext = check(input)
  const { width, height } = await measure(input.buffer, ext)
  const key = newKey(input.filename)
  const variants = await writeFile(key, input.buffer, ext, width)
  return Asset.create({
    key,
    filename: input.filename,
    title: titleFrom(input.filename),
    mimeType: MIME_TYPES[ext],
    size: input.buffer.length,
    width,
    height,
    variants,
    alt: '',
    caption: null,
    description: null,
    focalX: 0.5,
    focalY: 0.5,
    folder: await ensureFolder(folder),
  })
}

export async function replaceFile(asset: Asset, input: FileInput) {
  const ext = check(input)
  const { width, height } = await measure(input.buffer, ext)
  const previous = { key: asset.key, variants: asset.variants }
  const key = extensionOf(asset.key) === ext ? asset.key : newKey(input.filename)
  const variants = await writeFile(key, input.buffer, ext, width)
  const kept = new Set([key, ...variants.map((variant) => variant.key)])
  await removeFiles({
    key: kept.has(previous.key) ? '' : previous.key,
    variants: previous.variants.filter((variant) => !kept.has(variant.key)),
  })
  asset.merge({
    key,
    filename: input.filename,
    mimeType: MIME_TYPES[ext],
    size: input.buffer.length,
    width,
    height,
    variants,
    focalX: 0.5,
    focalY: 0.5,
  })
  await asset.save()
  return asset
}

export async function importArchive(
  path: string,
  options: { name: string; folder: string; onProgress?: (progress: ArchiveProgress) => void }
): Promise<ArchiveResult> {
  const archive = await readArchive(path)
  const entries = archive.filter(
    (entry) =>
      !entry.directory &&
      !entry.name.startsWith('__MACOSX/') &&
      !basename(entry.name).startsWith('.')
  )
  if (entries.length > LIMITS.archiveFiles) {
    throw new UploadError(`holds ${entries.length} files; the limit is ${LIMITS.archiveFiles}`)
  }
  const target = joinFolder(normalizeFolder(options.folder), titleFrom(options.name))
  const result: ArchiveResult = { folder: target, assets: [], failures: [], skipped: 0 }
  let unpacked = 0
  options.onProgress?.({ processed: 0, total: entries.length })

  for (const [index, entry] of entries.entries()) {
    const filename = basename(entry.name)
    if (!MIME_TYPES[extensionOf(filename)] || isArchive(filename)) {
      result.skipped++
    } else {
      try {
        const buffer = await extractEntry(path, entry, LIMITS.fileBytes)
        unpacked += buffer.length
        if (unpacked > LIMITS.archiveBytes) {
          result.failures.push('Stopped: the archive unpacks to more than 2 GB')
          break
        }
        const inner = dirname(entry.name) === '.' ? '' : dirname(entry.name)
        result.assets.push(await storeFile({ buffer, filename }, `${target}/${inner}`))
      } catch (error) {
        result.failures.push(`${entry.name} ${error instanceof Error ? error.message : 'failed'}`)
      }
    }
    options.onProgress?.({ processed: index + 1, total: entries.length })
  }
  await ensureFolder(target)
  return result
}

export async function updateDetails(asset: Asset, details: AssetDetails) {
  const { folder, ...rest } = details
  asset.merge(Object.fromEntries(Object.entries(rest).filter(([, value]) => value !== undefined)))
  if (folder !== undefined) asset.folder = await ensureFolder(folder)
  await asset.save()
  return asset
}

export async function findActive(ids: number[]) {
  if (!ids.length) return []
  return Asset.query()
    .apply((scopes) => scopes.active())
    .whereIn('id', ids)
}

export async function moveAssets(ids: number[], folder: string) {
  const path = await ensureFolder(folder)
  const assets = await findActive(ids)
  for (const asset of assets) {
    asset.folder = path
    await asset.save()
  }
  return assets
}

export async function trashAssets(ids: number[]) {
  const assets = await findActive(ids)
  for (const asset of assets) {
    asset.deletedAt = DateTime.now()
    await asset.save()
  }
  return assets
}

export async function restoreAsset(id: number) {
  const asset = await Asset.query()
    .apply((scopes) => scopes.trashed())
    .where('id', id)
    .firstOrFail()
  asset.deletedAt = null
  await asset.save()
  await ensureFolder(asset.folder)
  return asset
}

export async function purgeAsset(id: number) {
  const asset = await Asset.query()
    .apply((scopes) => scopes.trashed())
    .where('id', id)
    .firstOrFail()
  await removeFiles(asset)
  await asset.delete()
  return asset
}

export async function removeFiles(asset: { key: string; variants: AssetVariant[] | null }) {
  const disk = drive.use()
  for (const key of [asset.key, ...(asset.variants ?? []).map((variant) => variant.key)]) {
    if (key) await disk.delete(key).catch(() => {})
  }
}
