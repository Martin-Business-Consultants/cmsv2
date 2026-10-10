import BlockType from '#models/block_type'
import Entry from '#models/entry'
import Page from '#models/page'
import { plugins } from '#services/plugins'
import { renderRichText } from '#services/rich_text'
import {
  contactInfo,
  listKey,
  resolveCollectionList,
  type CollectionListResult,
  type ListedEntry,
} from '#services/collection_list'
import type { Block, Field, FieldData, LinkValue } from '#types/content'
import type { RenderBlock, ResolvedAsset, ResolvedEntry, ResolvedLink } from '#types/site'

type Refs = { assets: Set<number>; pages: Set<number>; entries: Set<number> }

type Loaded = {
  assets: Map<number, ResolvedAsset>
  pages: Map<number, Page>
  entries: Map<number, Entry>
}

export async function resolveAssets(ids: number[]) {
  const media = plugins.provided('media')
  if (!media || !ids.length) return new Map<number, ResolvedAsset>()
  return media.resolve([...new Set(ids)])
}

export async function resolveAsset(id: number | null | undefined) {
  if (!id) return null
  const assets = await resolveAssets([id])
  return assets.get(id) ?? null
}

export class ContentResolver {
  #blockTypes = new Map<string, Field[]>()
  #refs: Refs = { assets: new Set(), pages: new Set(), entries: new Set() }
  #loaded: Loaded = { assets: new Map(), pages: new Map(), entries: new Map() }
  #lists = new Map<string, CollectionListResult>()

  constructor(private options: { live: boolean } = { live: true }) {}

  async loadBlockTypes() {
    if (this.#blockTypes.size) return
    for (const type of await BlockType.all()) this.#blockTypes.set(type.slug, type.fields)
  }

  async blocks(blocks: Block[]): Promise<RenderBlock[]> {
    await this.loadBlockTypes()
    this.#collectBlocks(blocks)
    await this.#collectLists(blocks)
    await this.#load()
    return this.#mapBlocks(blocks)
  }

  async data(fields: Field[], data: FieldData): Promise<Record<string, any>> {
    await this.loadBlockTypes()
    this.#collect(fields, data)
    await this.#load()
    return this.#map(fields, data)
  }

  async asset(id: number | null | undefined): Promise<ResolvedAsset | null> {
    return resolveAsset(id)
  }

  #collectBlocks(blocks: Block[]) {
    for (const block of blocks ?? []) {
      const fields = this.#blockTypes.get(block.type)
      if (fields) this.#collect(fields, block.data)
    }
  }

  #collect(fields: Field[], data: FieldData) {
    for (const field of fields) {
      const value = data?.[field.name]
      if (value === null || value === undefined) continue
      if (field.type === 'asset' && typeof value === 'number') this.#refs.assets.add(value)
      if (field.type === 'entry' && typeof value === 'number') this.#refs.entries.add(value)
      if (field.type === 'record_refs' && Array.isArray(value)) {
        for (const id of value) if (typeof id === 'number') this.#refs.entries.add(id)
      }
      if (field.type === 'link') {
        const link = value as LinkValue
        if (link.kind === 'page') this.#refs.pages.add(Number(link.value))
        if (link.kind === 'entry') this.#refs.entries.add(Number(link.value))
      }
      if (field.type === 'group') this.#collect(field.of ?? [], value as FieldData)
      if (field.type === 'repeater' && Array.isArray(value)) {
        for (const item of value) this.#collect(field.of ?? [], item)
      }
      if (field.type === 'blocks' && Array.isArray(value)) this.#collectBlocks(value)
    }
  }

  async #collectLists(blocks: Block[]) {
    for (const block of blocks ?? []) {
      if (block?.type !== 'collection_list') continue
      const key = listKey(block.data)
      if (this.#lists.has(key)) continue
      const result = await resolveCollectionList(block.data ?? {}, this.options)
      for (const entry of result.entries) this.#collect(entry.fields ?? [], entry.data)
      this.#lists.set(key, result)
    }
  }

  async #load() {
    const missing = (ids: Set<number>, loaded: Map<number, unknown>) =>
      [...ids].filter((id) => !loaded.has(id))

    const assetIds = missing(this.#refs.assets, this.#loaded.assets)
    for (const [id, asset] of await resolveAssets(assetIds)) this.#loaded.assets.set(id, asset)

    const pageIds = missing(this.#refs.pages, this.#loaded.pages)
    if (pageIds.length) {
      for (const page of await Page.query().whereIn('id', pageIds).whereNull('deleted_at')) {
        this.#loaded.pages.set(page.id, page)
      }
    }

    const entryIds = missing(this.#refs.entries, this.#loaded.entries)
    if (entryIds.length) {
      const entries = await Entry.query()
        .whereIn('id', entryIds)
        .whereNull('deleted_at')
        .preload('collection')
      for (const entry of entries) this.#loaded.entries.set(entry.id, entry)
    }

    for (const list of this.#lists.values()) {
      for (const entry of list.entries as ListedEntry[]) {
        if (!entry.fields) continue
        entry.data = await this.#map(entry.fields, entry.data)
        delete entry.fields
      }
    }
  }

  async #mapBlocks(blocks: Block[]): Promise<RenderBlock[]> {
    const out: RenderBlock[] = []
    for (const block of blocks ?? []) {
      const fields = this.#blockTypes.get(block.type)
      if (!fields) continue
      const data = await this.#map(fields, block.data)
      if (block.type === 'collection_list') {
        const list = this.#lists.get(listKey(block.data))
        data.entries = list?.entries ?? []
        data.total = list?.total ?? 0
        data.collection = list?.collection ?? null
        if (list?.groups) data.groups = list.groups
        if (list?.error) data.error = list.error
      }
      if (block.type === 'contact_info') data.contact = await contactInfo()
      out.push({ id: block.id, type: block.type, data })
    }
    return out
  }

  async #map(fields: Field[], data: FieldData): Promise<Record<string, any>> {
    const out: Record<string, any> = { ...data }
    for (const field of fields) {
      const value = data?.[field.name]
      if (value === null || value === undefined) continue
      switch (field.type) {
        case 'asset':
          out[field.name] = this.#loaded.assets.get(Number(value)) ?? null
          break
        case 'entry': {
          const entry = this.#loaded.entries.get(Number(value))
          out[field.name] = entry ? this.#entry(entry) : null
          break
        }
        case 'record_refs':
          out[field.name] = (Array.isArray(value) ? value : [])
            .map((id) => this.#loaded.entries.get(Number(id)))
            .filter((entry): entry is Entry => Boolean(entry))
            .map((entry) => this.#entry(entry))
          break
        case 'richtext':
          out[field.name] = { html: renderRichText(value), doc: value }
          break
        case 'link':
          out[field.name] = this.#link(value as LinkValue)
          break
        case 'group':
          out[field.name] = await this.#map(field.of ?? [], value as FieldData)
          break
        case 'repeater':
          out[field.name] = []
          for (const item of Array.isArray(value) ? value : []) {
            out[field.name].push(await this.#map(field.of ?? [], item))
          }
          break
        case 'blocks':
          out[field.name] = Array.isArray(value) ? await this.#mapBlocks(value) : []
          break
        default: {
          const resolver = plugins.fieldType(field.type)?.resolve
          if (resolver) out[field.name] = await resolver(value, field, { live: this.options.live })
        }
      }
    }
    return out
  }

  #entry(entry: Entry): ResolvedEntry {
    return {
      id: entry.id,
      title: entry.title,
      slug: entry.slug,
      url: entry.publicPath,
      collection: entry.collection?.slug ?? '',
      publishedAt: entry.publishedAt?.toISO() ?? null,
      data: entry.data,
    }
  }

  #link(link: LinkValue): ResolvedLink | null {
    if (!link?.kind) return null
    const label = link.label || null
    if (link.kind === 'url') return { kind: 'url', href: String(link.value ?? ''), label }
    if (link.kind === 'page') {
      const page = this.#loaded.pages.get(Number(link.value))
      return page ? { kind: 'page', href: page.publicPath, label: label ?? page.title } : null
    }
    const entry = this.#loaded.entries.get(Number(link.value))
    return entry?.publicPath
      ? { kind: 'entry', href: entry.publicPath, label: label ?? entry.title }
      : null
  }
}
