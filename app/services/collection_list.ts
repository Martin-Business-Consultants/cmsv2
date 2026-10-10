import Collection from '#models/collection'
import Entry from '#models/entry'
import { getSettings } from '#services/settings'
import type { Field, FieldData } from '#types/content'
import type { ResolvedEntry } from '#types/site'
import { applyTagFilter, groupByTaxonomy, taxonomyOf, type TaxonomyTerm } from '#services/taxonomy'

export const ENTRY_SORTABLE = ['published_at', 'updated_at', 'created_at', 'title'] as const

const LEGACY_SORT: Record<string, { sortBy: string; sortDir: 'asc' | 'desc' }> = {
  newest: { sortBy: 'published_at', sortDir: 'desc' },
  oldest: { sortBy: 'published_at', sortDir: 'asc' },
  title: { sortBy: 'title', sortDir: 'asc' },
}

export type ListedEntry = ResolvedEntry & {
  locale?: string
  fields?: Field[]
  category?: TaxonomyTerm | null
  tags?: TaxonomyTerm[]
}

export type EntryGroup = { key: string; label: string; entries: ListedEntry[] }

export type CollectionListResult = {
  collection: { slug: string; name: string } | null
  entries: ListedEntry[]
  total: number
  groups?: EntryGroup[]
  error?: string
  slug?: string
}

export type CollectionListQuery = {
  collection: Collection
  entries: Entry[]
  rows: ListedEntry[]
}

export function listKey(data: FieldData) {
  const keys = [
    'collection_slug',
    'filter_status',
    'filter_tags',
    'sort_by',
    'sort_dir',
    'sort',
    'limit',
    'group_by',
  ]
  return JSON.stringify(keys.map((key) => data?.[key] ?? null))
}

function sortOf(data: FieldData) {
  const sortBy = String(data.sort_by ?? '')
  if ((ENTRY_SORTABLE as readonly string[]).includes(sortBy)) {
    return { sortBy, sortDir: data.sort_dir === 'asc' ? ('asc' as const) : ('desc' as const) }
  }
  return LEGACY_SORT[String(data.sort ?? '')] ?? LEGACY_SORT.newest
}

function limitOf(data: FieldData) {
  const limit = Number.parseInt(String(data.limit ?? ''), 10)
  return Number.isFinite(limit) && limit > 0 ? limit : 0
}

export function listedEntry(entry: Entry, collection: Collection): ListedEntry {
  return {
    id: entry.id,
    title: entry.title,
    slug: entry.slug,
    status: entry.status,
    locale: entry.locale,
    url: entry.publicPath,
    collection: collection.slug,
    publishedAt: entry.publishedAt?.toISO() ?? null,
    updatedAt: entry.updatedAt?.toISO() ?? null,
    data: entry.data ?? {},
    fields: collection.fields,
  }
}

function positionOf(entry: Entry) {
  const position = entry.data?.position
  return typeof position === 'number' ? position : Number.POSITIVE_INFINITY
}

function ordered(entries: Entry[]) {
  return [...entries].sort(
    (a, b) => positionOf(a) - positionOf(b) || a.title.localeCompare(b.title)
  )
}

function idsIn(value: unknown) {
  return (Array.isArray(value) ? value : [value]).map((item) => Number(item)).filter(Boolean)
}

async function groupByReference(
  field: Field,
  entries: Entry[],
  rows: ListedEntry[],
  key: string
): Promise<EntryGroup[]> {
  const referenced = await Collection.findBy('slug', field.collection)
  if (!referenced) return []
  const pool = await Entry.query()
    .where('collection_id', referenced.id)
    .where('status', 'published')
    .whereNull('deleted_at')
  const groups: EntryGroup[] = []
  for (const ref of ordered(pool)) {
    const bucket = rows.filter((_row, index) => idsIn(entries[index].data?.[key]).includes(ref.id))
    if (bucket.length) groups.push({ key: ref.slug, label: ref.title, entries: bucket })
  }
  return groups
}

function groupByValue(entries: Entry[], rows: ListedEntry[], key: string): EntryGroup[] {
  const groups = new Map<string, EntryGroup>()
  rows.forEach((row, index) => {
    const raw = entries[index].data?.[key]
    const value = raw === null || raw === undefined ? '' : String(raw)
    const group = groups.get(value) ?? { key: value, label: value, entries: [] }
    group.entries.push(row)
    groups.set(value, group)
  })
  return [...groups.values()]
}

export async function groupEntries(
  collection: Collection,
  entries: Entry[],
  rows: ListedEntry[],
  key: string
): Promise<EntryGroup[]> {
  if (key === 'category' || key === 'tags') return groupByTaxonomy(collection, rows, key)
  const field = (collection.fields ?? []).find((candidate) => candidate.name === key)
  if (field && ['entry', 'record_refs'].includes(String(field.type)) && field.collection) {
    return groupByReference(field, entries, rows, key)
  }
  return groupByValue(entries, rows, key)
}

export async function resolveCollectionList(
  data: FieldData,
  options: { live: boolean }
): Promise<CollectionListResult> {
  const slug = String(data?.collection_slug ?? '')
  const collection = slug ? await Collection.findBy('slug', slug) : null
  if (!collection) {
    return { error: 'collection not found', slug, collection: null, entries: [], total: 0 }
  }

  const query = Entry.query().where('collection_id', collection.id)
  if (options.live || data.filter_status !== 'any') query.withScopes((scopes) => scopes.live())
  else query.whereNull('deleted_at')
  await applyTagFilter(query, collection, data.filter_tags)

  const { sortBy, sortDir } = sortOf(data)
  query.orderBy(sortBy, sortDir).orderBy('id', sortDir)

  const [counted] = await query.clone().clearOrder().count('* as total')
  const total = Number(counted.$extras.total)
  const limit = limitOf(data)
  if (limit) query.limit(limit)
  const entries = await query
  for (const entry of entries) entry.$setRelated('collection', collection)
  const rows = entries.map((entry) => listedEntry(entry, collection))
  const taxonomy = await taxonomyOf('entry', entries)
  for (const row of rows) Object.assign(row, taxonomy.get(row.id))

  const result: CollectionListResult = {
    collection: { slug: collection.slug, name: collection.name },
    entries: rows,
    total,
  }
  const groupBy = typeof data.group_by === 'string' ? data.group_by.trim() : ''
  if (groupBy) result.groups = await groupEntries(collection, entries, rows, groupBy)
  return result
}

export const CONTACT_KEYS = ['title', 'phone', 'email', 'address_line1', 'city', 'state', 'zip']

export async function contactInfo() {
  const settings = await getSettings()
  const locality = [settings.city, [settings.state, settings.zip].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ')
  return {
    title: settings.siteName,
    phone: settings.phone,
    email: settings.contactEmail,
    address_line1: settings.addressLine1,
    city: settings.city,
    state: settings.state,
    zip: settings.zip,
    address: [settings.addressLine1, locality].filter(Boolean).join('\n'),
  }
}
