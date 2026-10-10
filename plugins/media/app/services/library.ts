import Asset from '../models/asset.js'
import { normalizeFolder } from './folders.js'
import { absoluteUrl } from '#services/delivery'
import { applySearch, listParams } from '#services/listing'
import type { AssetOption } from '#types/content'
import type { ResolvedAsset } from '#types/site'

export const ASSET_TYPES = ['images', 'video', 'audio', 'documents'] as const

export type AssetType = (typeof ASSET_TYPES)[number]

export const SORTS = { title: 'title', filename: 'filename', size: 'size', date: 'created_at' }

export type LibraryFilters = {
  search?: string
  type?: string
  folder?: string
  missingAlt?: boolean
  sort?: string
  order?: 'asc' | 'desc'
}

export function parseFilters(qs: Record<string, unknown>) {
  const params = listParams(qs, { sorts: SORTS, sort: 'date', order: 'desc' })
  return {
    search: params.search,
    type: ASSET_TYPES.includes(qs.type as AssetType) ? String(qs.type) : '',
    folder: normalizeFolder(qs.folder),
    missingAlt: qs.missingAlt === '1' || qs.missingAlt === 'true',
    sort: params.sort,
    order: params.order,
  }
}

export function libraryQuery(filters: LibraryFilters) {
  const query = Asset.query().apply((scopes) => scopes.active())
  const column = SORTS[filters.sort as keyof typeof SORTS] ?? 'created_at'
  query.orderBy(column, filters.order ?? 'desc').orderBy('id', filters.order ?? 'desc')
  if (filters.search) {
    applySearch(query, filters.search, ['filename', 'title', 'alt', 'caption'])
  } else if (!filters.missingAlt && filters.folder !== undefined) {
    query.where('folder', normalizeFolder(filters.folder))
  }
  if (filters.type === 'images') query.whereLike('mime_type', 'image/%')
  if (filters.type === 'video') query.whereLike('mime_type', 'video/%')
  if (filters.type === 'audio') query.whereLike('mime_type', 'audio/%')
  if (filters.type === 'documents') {
    query
      .whereNot('mime_type', 'like', 'image/%')
      .whereNot('mime_type', 'like', 'video/%')
      .whereNot('mime_type', 'like', 'audio/%')
  }
  if (filters.missingAlt) {
    query.whereLike('mime_type', 'image/%').where((q) => q.whereNull('alt').orWhere('alt', ''))
  }
  return query
}

export function assetOption(asset: Asset): AssetOption {
  return {
    id: asset.id,
    filename: asset.displayTitle,
    url: asset.url,
    isImage: asset.isImage,
    width: asset.width,
    height: asset.height,
    alt: asset.alt,
  }
}

export function resolvedAsset(asset: Asset): ResolvedAsset {
  return {
    id: asset.id,
    url: asset.url,
    alt: asset.alt ?? '',
    width: asset.width,
    height: asset.height,
    srcset: asset.srcset,
    mimeType: asset.mimeType,
    caption: asset.caption,
    focalPoint: { x: asset.focalX, y: asset.focalY },
  }
}

export async function resolveAssets(ids: number[]) {
  const assets = await Asset.query()
    .apply((scopes) => scopes.active())
    .whereIn('id', ids)
  return new Map(assets.map((asset) => [asset.id, resolvedAsset(asset)]))
}

export function apiAsset(asset: Asset) {
  return {
    id: asset.id,
    title: asset.displayTitle,
    filename: asset.filename,
    url: absoluteUrl(asset.url),
    mimeType: asset.mimeType,
    size: asset.size,
    width: asset.width,
    height: asset.height,
    alt: asset.alt ?? '',
    caption: asset.caption,
    description: asset.description,
    folder: asset.folder,
    focalPoint: { x: asset.focalX, y: asset.focalY },
    variants: asset.variants.map((variant) => ({
      width: variant.width,
      url: absoluteUrl(`/uploads/${variant.key}`),
    })),
    createdAt: asset.createdAt.toISO(),
    updatedAt: asset.updatedAt?.toISO() ?? null,
  }
}

const DELIVERY_WIDTHS = [640, 1280, 1920]

export function deliveryAsset(asset: Asset) {
  const original = absoluteUrl(asset.url)
  const renditions = [...asset.variants]
    .sort((a, b) => a.width - b.width)
    .map((variant) => ({
      width: variant.width,
      descriptor: `${variant.width}w`,
      url: absoluteUrl(`/uploads/${variant.key}`),
    }))
  const image = asset.isImage && asset.mimeType !== 'image/svg+xml'
  const variants: Record<string, string> = {}
  if (image) {
    for (const width of DELIVERY_WIDTHS) {
      const fit = renditions.filter((rendition) => rendition.width <= width).at(-1)
      variants[`w${width}`] = fit?.url ?? original
    }
  }
  return {
    id: asset.id,
    url: original,
    original,
    filename: asset.filename,
    title: asset.title,
    content_type: asset.mimeType,
    byte_size: asset.size,
    alt: asset.alt || null,
    caption: asset.caption,
    description: asset.description,
    width: asset.width,
    height: asset.height,
    folder: asset.folder,
    variants,
    srcset: image ? renditions : [],
    thumb_url: variants.w640 ?? original,
    focal_x: asset.focalX,
    focal_y: asset.focalY,
    updated_at: asset.updatedAt?.toUTC().toISO() ?? null,
  }
}

export async function deliverAssets(ids: number[]) {
  const assets = await Asset.query()
    .apply((scopes) => scopes.active())
    .whereIn('id', ids)
  return new Map(assets.map((asset) => [asset.id, deliveryAsset(asset)]))
}
