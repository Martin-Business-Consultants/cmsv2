import { createHash } from 'node:crypto'
import type { HttpContext } from '@adonisjs/core/http'
import { Exception } from '@adonisjs/core/exceptions'
import type Entry from '#models/entry'
import type Page from '#models/page'
import type Collection from '#models/collection'
import { forbidden } from '#services/api_errors'
import { envelopeFor, wantsEnvelope } from '#services/management'
import { getSettings } from '#services/settings'
import {
  DeliveryEncoder,
  cmsUrl,
  deliveryFields,
  ownCacheTags,
  type DeliveredAsset,
} from '#services/delivery_encoder'

export { DeliveryEncoder, ownCacheTags } from '#services/delivery_encoder'

const DEFAULT_MESSAGES: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
}

export const DEFAULT_PER = 50

export const MAX_PER = 100

export class ApiError extends Exception {
  constructor(status: 400 | 401 | 403 | 404, message?: string) {
    super(message ?? DEFAULT_MESSAGES[status], { status })
  }
}

export function notFound(message = 'Not found'): never {
  throw new ApiError(404, message)
}

export function badRequest(message: string): never {
  throw new ApiError(400, message)
}

export function isApiRequest(ctx: HttpContext) {
  return ctx.request.url().startsWith('/api/')
}

export function authorizeClient(ctx: HttpContext, capability: string) {
  const caller = ctx.apiCaller
  if (!caller) throw new ApiError(401)
  if (!caller.can(capability)) forbidden(capability)
  return caller
}

export function readable(ctx: HttpContext, capability: string) {
  return ctx.apiCaller?.can(capability) ?? false
}

export function etagOf(...parts: unknown[]) {
  return `"${createHash('sha256').update(JSON.stringify(parts)).digest('base64url').slice(0, 43)}"`
}

function fresh(ctx: HttpContext, etag: string) {
  const ifNoneMatch = ctx.request.header('if-none-match')
  if (!ifNoneMatch) return false
  const tags = ifNoneMatch.split(',').map((tag) => tag.trim().replace(/^W\//, ''))
  return tags.includes(etag) || tags.includes('*')
}

export function cacheTags(ctx: HttpContext, tags: Iterable<string | null | undefined>) {
  const list = [...new Set([...tags].filter((tag): tag is string => Boolean(tag)))]
  if (list.length) ctx.response.header('Cache-Tag', list.join(','))
}

export type RespondOptions = {
  included?: Record<string, DeliveredAsset> | undefined
  tags?: Iterable<string | null | undefined>
  etag?: unknown[]
}

export function respond(
  ctx: HttpContext,
  data: unknown,
  meta: Record<string, unknown> = {},
  options: RespondOptions = {}
) {
  const { response } = ctx
  const answer: Record<string, unknown> = { data, meta }
  if (options.included !== undefined) answer.included = { assets: options.included }
  const payload = wantsEnvelope(ctx) ? envelopeFor(ctx, answer, null, null) : answer
  const body = JSON.stringify(payload)
  const etag = options.etag ? etagOf(...options.etag, wantsEnvelope(ctx)) : etagOf(body)
  if (options.tags) cacheTags(ctx, options.tags)
  response.header('ETag', etag)
  response.header('Cache-Control', 'private, max-age=0, must-revalidate')
  response.header('Vary', 'Authorization, X-Agent-Envelope')
  if (fresh(ctx, etag)) return response.status(304).send('')
  response.header('Content-Type', 'application/json; charset=utf-8')
  return response.send(body)
}

function integer(value: unknown) {
  const match = /^\s*\d+/.exec(String(value ?? ''))
  return match ? Number.parseInt(match[0], 10) : 0
}

export function pagination(ctx: HttpContext) {
  const qs = ctx.request.qs()
  const page = Math.min(Math.max(integer(qs.page), 1), 100_000)
  const raw = qs.per ?? qs.per_page
  const per = Math.min(Math.max(raw === undefined || raw === '' ? DEFAULT_PER : integer(raw), 1), MAX_PER)
  return { page, per, perPage: per, offset: (page - 1) * per }
}

export function listMeta(page: number, per: number, total: number) {
  return { page, per, total, next_page: page * per < total ? page + 1 : null }
}

export function pageMeta(paginator: { currentPage: number; perPage: number; total: number }) {
  return listMeta(paginator.currentPage, paginator.perPage, paginator.total)
}

export function siteUrl() {
  return cmsUrl()
}

export function absoluteUrl(path: string) {
  return `${cmsUrl()}${path}`
}

export async function publicSiteUrl() {
  const { siteBaseUrl } = await getSettings()
  return (siteBaseUrl || cmsUrl()).replace(/\/+$/, '')
}

export function absoluteOn(base: string, loc: string) {
  return /^https?:\/\//i.test(loc) ? loc : `${base}${loc}`
}

export function iso(value: { toISO(): string | null } | null | undefined) {
  return value?.toISO() ?? null
}

const SECRET_KEY = /(api[_-]?key|secret|token|password|client[_-]?secret)/i

export function redactSecrets<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => redactSecrets(item)) as T
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        SECRET_KEY.test(key) && typeof item === 'string' && item !== ''
          ? `***${item.length >= 4 ? item.slice(-4) : ''}`
          : redactSecrets(item),
      ])
    ) as T
  }
  return value
}

export function serializeCollection(collection: Collection) {
  return {
    id: collection.id,
    slug: collection.slug,
    name: collection.name,
    singular_name: collection.singularName,
    description: collection.description,
    url_prefix: collection.urlPrefix || null,
    enable_blocks: Boolean(collection.enableBlocks),
    enable_body: Boolean(collection.enableBody),
    fields: deliveryFields(collection.fields),
  }
}

export async function serializePage(page: Page) {
  const encoder = await new DeliveryEncoder().prepare({ pages: [page] })
  return encoder.page(page)
}

export async function serializeEntry(entry: Entry, collection: Collection) {
  entry.$setRelated('collection', collection)
  const encoder = await new DeliveryEncoder().prepare({ entries: [entry] })
  return encoder.entry(entry)
}

export function pageTags(page: Page) {
  return [`page:${page.path}`, ...ownCacheTags(page.blocks ?? [])]
}

export function entryTag(collection: string | null | undefined, slug: string) {
  return `entry:${collection ?? ''}/${slug}`
}

const SEO_STRING = { type: 'string' }

export const SEO_SCHEMA = {
  'type': 'object',
  'x-cms-type': 'seo',
  'properties': {
    meta_title: { ...SEO_STRING, 'title': 'Meta title', 'maxLength': 200, 'x-cms-type': 'string' },
    meta_description: {
      ...SEO_STRING,
      'title': 'Meta description',
      'maxLength': 500,
      'x-cms-type': 'text',
    },
    canonical_url: { ...SEO_STRING, 'title': 'Canonical URL', 'format': 'uri', 'x-cms-type': 'url' },
    focus_keyword: { ...SEO_STRING, 'title': 'Focus keyword', 'x-cms-type': 'string' },
    noindex: { 'type': 'boolean', 'title': 'Hide from search engines', 'x-cms-type': 'boolean' },
    nofollow: { 'type': 'boolean', 'title': 'Nofollow', 'x-cms-type': 'boolean' },
    og_image_id: { ...SEO_STRING, 'title': 'Social image', 'x-cms-type': 'asset' },
    og_title: { ...SEO_STRING, 'title': 'Social title', 'x-cms-type': 'string' },
    og_description: { ...SEO_STRING, 'title': 'Social description', 'x-cms-type': 'text' },
    og_type: {
      'type': 'string',
      'title': 'Social type',
      'enum': ['article', 'product', 'profile', 'video.other', 'website'],
      'x-cms-type': 'select',
    },
    twitter_card: {
      'type': 'string',
      'title': 'Twitter card',
      'enum': ['app', 'player', 'summary', 'summary_large_image'],
      'x-cms-type': 'select',
    },
    schema_type: {
      'type': 'string',
      'title': 'Schema type',
      'enum': [
        'Article',
        'BlogPosting',
        'Event',
        'FAQPage',
        'HowTo',
        'LocalBusiness',
        'NewsArticle',
        'Product',
        'Recipe',
        'WebPage',
      ],
      'x-cms-type': 'select',
    },
    json_ld: { 'type': ['object', 'array'], 'title': 'JSON-LD', 'x-cms-type': 'json' },
    sitemap_priority: {
      'type': 'number',
      'title': 'Sitemap priority',
      'minimum': 0,
      'maximum': 1,
      'x-cms-type': 'number',
    },
    sitemap_changefreq: {
      'type': 'string',
      'title': 'Sitemap change frequency',
      'enum': ['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never'],
      'x-cms-type': 'select',
    },
  },
  'additionalProperties': true,
}
