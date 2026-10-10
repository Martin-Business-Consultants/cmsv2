import BlockType from '#models/block_type'
import Entry from '#models/entry'
import Page from '#models/page'
import type Collection from '#models/collection'
import type Global from '#models/global'
import { plugins } from '#services/plugins'
import { renderRichText } from '#services/rich_text'
import { getSettings } from '#services/settings'
import { localizePath } from '#services/locale_paths'
import { liveTranslations, siteLocales } from '#services/locales'
import { taxonomyOf, type RecordTaxonomy } from '#services/taxonomy'
import {
  contactInfo,
  listKey,
  resolveCollectionList,
  type CollectionListResult,
  type ListedEntry,
} from '#services/collection_list'
import type { Block, Field, FieldData, LinkValue, Seo } from '#types/content'
import type { ResolvedAsset } from '#types/site'
import env from '#start/env'

export type Json = Record<string, unknown>

export type DeliveredAsset = Json & { id: number; url: string }

type Translation = { locale: string; path: string }

const SEO_RENAMES: Record<string, string> = {
  title: 'meta_title',
  description: 'meta_description',
  imageId: 'og_image_id',
}

const VARIANT_NAMES = ['w640', 'w1280', 'w1920']

export function cmsUrl() {
  return env.get('APP_URL').replace(/\/+$/, '')
}

export function absoluteCmsUrl(path: string) {
  return /^https?:\/\//i.test(path) ? path : `${cmsUrl()}${path}`
}

export function snakeKey(key: string) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/-/g, '_')
    .toLowerCase()
}

export function utc(value: { toUTC(): { toISO(): string | null } } | null | undefined) {
  return value ? value.toUTC().toISO() : null
}

function isImageKey(key: string) {
  return key === 'imageId' || /ImageId$/.test(key)
}

function present(value: unknown) {
  return value !== null && value !== undefined && value !== ''
}

export function deliverySeo(seo: Seo | null | undefined, assets?: Set<number>) {
  const out: Json = {}
  for (const [key, value] of Object.entries(seo ?? {})) {
    if (!present(value)) continue
    const name = SEO_RENAMES[key] ?? snakeKey(key)
    if (isImageKey(key)) {
      const id = Number(value)
      if (!Number.isInteger(id) || id < 1) continue
      assets?.add(id)
      out[name] = String(id)
      continue
    }
    out[name] = value
  }
  return out
}

const FIELD_RENAMES: Record<string, string> = {
  collection: 'of_collection',
  allowedTypes: 'allowed_types',
  showIf: 'show_if',
}

export function deliveryFields(fields: Field[] | null | undefined): Json[] {
  return (fields ?? []).map((field) => {
    const out: Json = {}
    for (const [key, value] of Object.entries(field)) {
      if (key === 'of') out.of = deliveryFields(value as Field[])
      else out[FIELD_RENAMES[key] ?? snakeKey(key)] = value
    }
    if (field.type === 'entry') out.type = 'record_ref'
    return out
  })
}

function variantsOf(asset: ResolvedAsset) {
  const found = (asset.srcset ?? '')
    .split(',')
    .map((part) => part.trim().split(/\s+/))
    .filter(([url, descriptor]) => url && /^\d+w$/.test(descriptor ?? ''))
    .map(([url, descriptor]) => ({ width: Number.parseInt(descriptor, 10), url: absoluteCmsUrl(url) }))
  return found
}

export function assetFromResolved(asset: ResolvedAsset): DeliveredAsset {
  const original = absoluteCmsUrl(asset.url)
  const image = asset.mimeType?.startsWith('image/') && asset.mimeType !== 'image/svg+xml'
  const renditions = image ? variantsOf(asset) : []
  const variants: Record<string, string> = {}
  if (image) {
    for (const name of VARIANT_NAMES) {
      const width = Number(name.slice(1))
      const fit = renditions.find((rendition) => rendition.width === width)
      const below = renditions.filter((rendition) => rendition.width <= width).at(-1)
      variants[name] = fit?.url ?? below?.url ?? original
    }
  }
  return {
    id: asset.id,
    url: original,
    original,
    filename: decodeURIComponent(original.split('/').pop() ?? ''),
    content_type: asset.mimeType,
    byte_size: null,
    alt: asset.alt || null,
    caption: asset.caption ?? null,
    width: asset.width,
    height: asset.height,
    variants,
    srcset: renditions.map((rendition) => ({
      width: rendition.width,
      descriptor: `${rendition.width}w`,
      url: rendition.url,
    })),
    thumb_url: variants.w640 ?? original,
    focal_x: asset.focalPoint?.x ?? null,
    focal_y: asset.focalPoint?.y ?? null,
  }
}

export async function deliverAssets(ids: Iterable<number>) {
  const media = plugins.provided('media')
  if (!media) return undefined
  const unique = [...new Set(ids)].filter((id) => Number.isInteger(id) && id > 0)
  const out: Record<string, DeliveredAsset> = {}
  if (!unique.length) return out
  if (media.deliver) {
    for (const [id, asset] of await media.deliver(unique)) out[String(id)] = asset
    return out
  }
  for (const [id, asset] of await media.resolve(unique)) out[String(id)] = assetFromResolved(asset)
  return out
}

export function ownCacheTags(blocks: Block[] | null | undefined, tags = new Set<string>()) {
  for (const block of blocks ?? []) {
    if (block?.type === 'collection_list' && block.data?.collection_slug) {
      tags.add(`collection:${block.data.collection_slug}`)
    }
    if (block?.type === 'contact_info') tags.add('site')
  }
  return tags
}

export class DeliveryEncoder {
  readonly assetIds = new Set<number>()
  #blockTypes = new Map<string, Field[]>()
  #pageIds = new Set<number>()
  #entryIds = new Set<number>()
  #pages = new Map<number, Page>()
  #entries = new Map<number, Entry>()
  #listData: FieldData[] = []
  #lists = new Map<string, CollectionListResult>()
  #contact: Json | null = null
  #needsContact = false
  #homePageId: number | null = null
  #taxonomy = { page: new Map<number, RecordTaxonomy>(), entry: new Map<number, RecordTaxonomy>() }
  #translations = {
    page: new Map<number, Translation[]>(),
    entry: new Map<number, Translation[]>(),
  }

  async prepare(records: { pages?: Page[]; entries?: Entry[]; globals?: Global[] }) {
    const pages = records.pages ?? []
    const entries = records.entries ?? []
    const globals = records.globals ?? []
    if (!this.#blockTypes.size) {
      for (const type of await BlockType.all()) this.#blockTypes.set(type.slug, type.fields ?? [])
    }
    const settings = await getSettings()
    await siteLocales()
    this.#homePageId = settings.homePageId

    for (const page of pages) {
      this.#collect(page.fields ?? [], page.frontmatter ?? {})
      this.#collectBlocks(page.blocks ?? [])
      deliverySeo(page.seo, this.assetIds)
    }
    for (const entry of entries) {
      this.#collect(entry.collection?.fields ?? [], entry.data ?? {})
      if (entry.collection?.enableBlocks) this.#collectBlocks(entry.blocks ?? [])
      deliverySeo(entry.seo, this.assetIds)
    }
    for (const global of globals) this.#collect(global.fields ?? [], global.data ?? {})

    await this.#resolveLists()
    if (this.#needsContact && !this.#contact) this.#contact = await contactInfo()
    await this.#load()

    const [pageTaxonomy, entryTaxonomy, pageLinks, entryLinks] = await Promise.all([
      taxonomyOf('page', pages),
      taxonomyOf('entry', entries),
      liveTranslations('page', pages),
      liveTranslations('entry', entries),
    ])
    for (const [id, value] of pageTaxonomy) this.#taxonomy.page.set(id, value)
    for (const [id, value] of entryTaxonomy) this.#taxonomy.entry.set(id, value)
    for (const [id, value] of pageLinks) this.#translations.page.set(id, value)
    for (const [id, value] of entryLinks) this.#translations.entry.set(id, value)
    return this
  }

  pageUrl(page: Page) {
    if (present(page.seo?.canonicalUrl)) return String(page.seo.canonicalUrl)
    if (this.#homePageId ? page.id === this.#homePageId : page.path === 'home') {
      return localizePath('/', page.locale)
    }
    return page.publicPath
  }

  entryUrl(entry: Entry) {
    if (present(entry.seo?.canonicalUrl)) return String(entry.seo.canonicalUrl)
    return entry.publicPath
  }

  page(page: Page) {
    const taxonomy = this.#taxonomy.page.get(page.id) ?? { category: null, tags: [] }
    return {
      id: page.id,
      path: page.path,
      slug: page.slug,
      title: page.title,
      locale: page.locale,
      url: this.pageUrl(page),
      blocks: this.blocks(page.blocks ?? []),
      frontmatter: this.data(page.fields ?? [], page.frontmatter ?? {}),
      seo: deliverySeo(page.seo),
      published_at: utc(page.publishedAt),
      updated_at: utc(page.updatedAt),
      category: taxonomy.category,
      tags: taxonomy.tags,
      translations: this.#translations.page.get(page.id) ?? [],
    }
  }

  entry(entry: Entry) {
    const collection = entry.collection as Collection | undefined
    const taxonomy = this.#taxonomy.entry.get(entry.id) ?? { category: null, tags: [] }
    return {
      id: entry.id,
      slug: entry.slug,
      title: entry.title,
      locale: entry.locale,
      collection: collection?.slug ?? null,
      url: this.entryUrl(entry),
      frontmatter: this.data(collection?.fields ?? [], entry.data ?? {}),
      body_markdown: null,
      body_html: collection?.enableBody && entry.body ? renderRichText(entry.body) : null,
      blocks: collection?.enableBlocks ? this.blocks(entry.blocks ?? []) : null,
      seo: deliverySeo(entry.seo),
      published_at: utc(entry.publishedAt),
      updated_at: utc(entry.updatedAt),
      category: taxonomy.category,
      tags: taxonomy.tags,
      translations: this.#translations.entry.get(entry.id) ?? [],
    }
  }

  global(global: Global) {
    return {
      id: global.id,
      slug: global.slug,
      name: global.name,
      data: this.data(global.fields ?? [], global.data ?? {}),
      updated_at: utc(global.updatedAt),
    }
  }

  async included() {
    return deliverAssets(this.assetIds)
  }

  blocks(blocks: Block[]): Json[] {
    const out: Json[] = []
    for (const block of blocks ?? []) {
      if (!block || typeof block.type !== 'string') continue
      const fields = this.#blockTypes.get(block.type)
      const encoded: Json = {
        ...(block.id ? { id: block.id } : {}),
        type: block.type,
        ...(block.version ? { version: block.version } : {}),
        data: fields ? this.data(fields, block.data ?? {}) : (block.data ?? {}),
      }
      if (block.type === 'collection_list') {
        encoded.resolved = this.#listResolved(block.data ?? {})
      }
      if (block.type === 'contact_info') encoded.resolved = { contact: this.#contact ?? {} }
      out.push(encoded)
    }
    return out
  }

  data(fields: Field[], data: FieldData): Json {
    const out: Json = { ...(data ?? {}) }
    for (const field of fields ?? []) {
      const value = data?.[field.name]
      if (value === null || value === undefined) continue
      switch (field.type) {
        case 'asset': {
          const id = Number(value)
          out[field.name] = Number.isInteger(id) && id > 0 ? String(id) : null
          break
        }
        case 'entry':
          out[field.name] = this.#entries.get(Number(value))?.slug ?? null
          break
        case 'record_refs':
          out[field.name] = (Array.isArray(value) ? value : [])
            .map((id) => this.#entries.get(Number(id))?.slug)
            .filter((slug): slug is string => Boolean(slug))
          break
        case 'richtext':
          out[field.name] = renderRichText(value)
          break
        case 'link':
          out[field.name] = this.#link(value as LinkValue)
          break
        case 'group':
          out[field.name] = this.data(field.of ?? [], value as FieldData)
          break
        case 'repeater':
          out[field.name] = (Array.isArray(value) ? value : []).map((item) =>
            this.data(field.of ?? [], item)
          )
          break
        case 'blocks':
          out[field.name] = Array.isArray(value) ? this.blocks(value) : []
          break
      }
    }
    return out
  }

  #link(link: LinkValue): Json | null {
    if (!link?.kind) return null
    const label = link.label ? { label: link.label } : {}
    if (link.kind === 'url') {
      return { kind: 'url', value: String(link.value ?? ''), ...label, url: String(link.value ?? '') }
    }
    if (link.kind === 'page') {
      const page = this.#pages.get(Number(link.value))
      if (!page) return null
      const home = this.#homePageId ? page.id === this.#homePageId : page.path === 'home'
      return {
        kind: 'page',
        value: home ? 'home' : page.path,
        locale: page.locale,
        ...label,
        url: this.pageUrl(page),
      }
    }
    const entry = this.#entries.get(Number(link.value))
    if (!entry) return null
    return {
      kind: 'entry',
      value: entry.slug,
      collection: entry.collection?.slug ?? null,
      locale: entry.locale,
      ...label,
      url: entry.publicPath,
    }
  }

  #listResolved(data: FieldData) {
    const list = this.#lists.get(listKey(data))
    if (!list) return { collection: null, entries: [], total: 0 }
    const listed = (entry: ListedEntry) => ({
      id: entry.id,
      slug: entry.slug,
      title: entry.title,
      status: entry.status ?? 'published',
      locale: entry.locale ?? null,
      collection: entry.collection,
      url: entry.url,
      frontmatter: this.data(entry.fields ?? [], entry.data ?? {}),
      body_markdown: null,
      published_at: entry.publishedAt,
      updated_at: entry.updatedAt ?? null,
      category: entry.category ?? null,
      tags: entry.tags ?? [],
    })
    return {
      collection: list.collection,
      entries: list.entries.map(listed),
      total: list.total,
      ...(list.groups
        ? {
            groups: list.groups.map((group) => ({
              key: group.key,
              label: group.label,
              entries: group.entries.map(listed),
            })),
          }
        : {}),
      ...(list.error ? { error: list.error } : {}),
    }
  }

  #collectBlocks(blocks: Block[]) {
    for (const block of blocks ?? []) {
      if (!block || typeof block.type !== 'string') continue
      if (block.type === 'collection_list') this.#listData.push(block.data ?? {})
      if (block.type === 'contact_info') this.#needsContact = true
      const fields = this.#blockTypes.get(block.type)
      if (fields) this.#collect(fields, block.data ?? {})
    }
  }

  #collect(fields: Field[], data: FieldData) {
    for (const field of fields ?? []) {
      const value = data?.[field.name]
      if (value === null || value === undefined) continue
      if (field.type === 'asset') {
        const id = Number(value)
        if (Number.isInteger(id) && id > 0) this.assetIds.add(id)
      }
      if (field.type === 'entry') this.#entryIds.add(Number(value))
      if (field.type === 'record_refs' && Array.isArray(value)) {
        for (const id of value) this.#entryIds.add(Number(id))
      }
      if (field.type === 'link') {
        const link = value as LinkValue
        if (link?.kind === 'page') this.#pageIds.add(Number(link.value))
        if (link?.kind === 'entry') this.#entryIds.add(Number(link.value))
      }
      if (field.type === 'group') this.#collect(field.of ?? [], value as FieldData)
      if (field.type === 'repeater' && Array.isArray(value)) {
        for (const item of value) this.#collect(field.of ?? [], item)
      }
      if (field.type === 'blocks' && Array.isArray(value)) this.#collectBlocks(value)
    }
  }

  async #resolveLists() {
    while (this.#listData.length) {
      const data = this.#listData.shift()!
      const key = listKey(data)
      if (this.#lists.has(key)) continue
      const result = await resolveCollectionList(data, { live: true })
      this.#lists.set(key, result)
      for (const entry of result.entries) this.#collect(entry.fields ?? [], entry.data ?? {})
    }
  }

  async #load() {
    const missing = (ids: Set<number>, loaded: Map<number, unknown>) =>
      [...ids].filter((id) => Number.isInteger(id) && id > 0 && !loaded.has(id))
    const pageIds = missing(this.#pageIds, this.#pages)
    if (pageIds.length) {
      for (const page of await Page.query().whereIn('id', pageIds).whereNull('deleted_at')) {
        this.#pages.set(page.id, page)
      }
    }
    const entryIds = missing(this.#entryIds, this.#entries)
    if (entryIds.length) {
      const entries = await Entry.query()
        .whereIn('id', entryIds)
        .whereNull('deleted_at')
        .preload('collection')
      for (const entry of entries) this.#entries.set(entry.id, entry)
    }
  }
}
