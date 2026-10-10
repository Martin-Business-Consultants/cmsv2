import db from '@adonisjs/lucid/services/db'
import type { QueryClientContract, TransactionClientContract } from '@adonisjs/lucid/types/database'
import { plugins } from '#services/plugins'
import type { Block, Field, LinkValue } from '#types/content'

export type OwnerType = 'page' | 'entry' | 'global'

export type RefType = 'asset' | 'page' | 'entry' | 'block_type' | 'form' | (string & {})

export type Reference = {
  refType: RefType
  refId: string
  kind: string
  path: string
  position: number
}

export type Usage = {
  ownerType: OwnerType
  ownerId: number
  label: string
  detail: string | null
  href: string
  status: string | null
  trashed: boolean
  kinds: string[]
  positions: number[]
}

type Client = QueryClientContract | TransactionClientContract | typeof db

type Indexable = { id: number; $trx?: TransactionClientContract } & Record<string, any>

type BlockTypes = Map<string, Field[]>

const TABLES: Record<OwnerType, string> = { page: 'pages', entry: 'entries', global: 'globals' }

function parse<T>(value: unknown, fallback: T): T {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T
    } catch {
      return fallback
    }
  }
  return (value ?? fallback) as T
}

function isObject(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function positiveId(value: unknown) {
  const id = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value
  return Number.isInteger(id) && Number(id) > 0 ? Number(id) : null
}

export async function blockTypeFields(client: Client = db): Promise<BlockTypes> {
  const rows = await client.from('block_types').select('slug', 'fields')
  return new Map(rows.map((row) => [row.slug as string, parse<Field[]>(row.fields, [])]))
}

class Collector {
  refs: Reference[] = []

  constructor(private blockTypes: BlockTypes) {}

  add(refType: RefType, refId: string | number, kind: string, path: string, position: number) {
    this.refs.push({ refType, refId: String(refId), kind, path: path.slice(0, 255), position })
  }

  fields(fields: Field[], data: unknown, path: string, position: number) {
    if (!isObject(data) || !Array.isArray(fields)) return
    for (const field of fields) {
      const value = data[field.name]
      if (value === null || value === undefined || value === '') continue
      const at = path ? `${path}.${field.name}` : field.name
      switch (field.type) {
        case 'asset': {
          const id = positiveId(value)
          if (id) this.add('asset', id, 'asset', at, position)
          break
        }
        case 'entry': {
          const id = positiveId(value)
          if (id) this.add('entry', id, 'record', at, position)
          break
        }
        case 'record_refs':
          if (Array.isArray(value)) {
            value.forEach((item, index) => {
              const id = positiveId(item)
              if (id) this.add('entry', id, 'record', `${at}.${index}`, position)
            })
          }
          break
        case 'link': {
          const link = value as LinkValue
          const id = positiveId(link?.value)
          if (id && (link.kind === 'page' || link.kind === 'entry'))
            this.add(link.kind, id, 'link', at, position)
          break
        }
        case 'group':
          this.fields(field.of ?? [], value, at, position)
          break
        case 'repeater':
          if (Array.isArray(value)) {
            value.forEach((item, index) =>
              this.fields(field.of ?? [], item, `${at}.${index}`, position)
            )
          }
          break
        case 'blocks':
          if (Array.isArray(value)) this.blocks(value, at, position)
          break
        default: {
          const references = plugins.fieldType(field.type)?.references
          if (!references) break
          try {
            for (const ref of references(value, field) ?? []) {
              this.add(ref.type, ref.id, field.type, at, position)
            }
          } catch {}
        }
      }
    }
  }

  blocks(blocks: unknown, path: string, position?: number) {
    if (!Array.isArray(blocks)) return
    blocks.forEach((block: Block, index) => {
      if (!isObject(block) || typeof block.type !== 'string') return
      const at = `${path}.${index}`
      const where = position ?? index
      this.add('block_type', block.type, 'block', at, where)
      const fields = this.blockTypes.get(block.type)
      if (fields) this.fields(fields, block.data, `${at}.data`, where)
    })
  }

  seo(seo: unknown) {
    const id = positiveId(parse<Record<string, any>>(seo, {})?.imageId)
    if (id) this.add('asset', id, 'seo', 'seo.imageId', -1)
  }
}

async function collectionFields(client: Client, collectionId: unknown) {
  if (!collectionId) return []
  const row = await client.from('collections').where('id', Number(collectionId)).first()
  return parse<Field[]>(row?.fields, [])
}

export async function referencesOf(
  ownerType: OwnerType,
  record: Indexable,
  options: { client?: Client; blockTypes?: BlockTypes } = {}
) {
  const client = options.client ?? record.$trx ?? db
  const collector = new Collector(options.blockTypes ?? (await blockTypeFields(client)))
  if (ownerType === 'page') {
    collector.blocks(parse(record.blocks, []), 'blocks')
    collector.fields(parse(record.fields, []), parse(record.frontmatter, {}), 'frontmatter', -1)
    collector.seo(record.seo)
  } else if (ownerType === 'entry') {
    const fields = await collectionFields(client, record.collectionId ?? record.collection_id)
    collector.fields(fields, parse(record.data, {}), 'data', -1)
    collector.blocks(parse(record.blocks, []), 'blocks')
    collector.seo(record.seo)
  } else {
    collector.fields(parse(record.fields, []), parse(record.data, {}), 'data', -1)
  }
  return collector.refs
}

export async function indexReferences(
  ownerType: OwnerType,
  record: Indexable,
  options: { client?: Client; blockTypes?: BlockTypes } = {}
) {
  const client = options.client ?? record.$trx ?? db
  const refs = await referencesOf(ownerType, record, { ...options, client })
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
  await client
    .from('content_references')
    .where({ owner_type: ownerType, owner_id: record.id })
    .delete()
  if (!refs.length) return refs
  const rows = refs.map((ref) => ({
    owner_type: ownerType,
    owner_id: record.id,
    ref_type: ref.refType,
    ref_id: ref.refId,
    kind: ref.kind,
    path: ref.path,
    position: ref.position,
    created_at: now,
  }))
  for (let start = 0; start < rows.length; start += 100) {
    await client.table('content_references').multiInsert(rows.slice(start, start + 100))
  }
  return refs
}

export async function removeReferences(ownerType: OwnerType, id: number, client: Client = db) {
  await client.from('content_references').where({ owner_type: ownerType, owner_id: id }).delete()
}

export async function rebuildReferences() {
  const blockTypes = await blockTypeFields()
  await db.from('content_references').delete()
  const counts: Record<OwnerType, number> = { page: 0, entry: 0, global: 0 }
  for (const ownerType of Object.keys(TABLES) as OwnerType[]) {
    const rows = await db.from(TABLES[ownerType]).select('*')
    for (const row of rows) {
      await indexReferences(ownerType, { ...row, collectionId: row.collection_id }, { blockTypes })
      counts[ownerType]++
    }
  }
  return counts
}

type Owner = {
  label: string
  detail: string | null
  href: string
  status: string | null
  trashed: boolean
}

async function owners(ownerType: OwnerType, ids: number[]): Promise<Map<number, Owner>> {
  const found = new Map<number, Owner>()
  if (!ids.length) return found
  if (ownerType === 'page') {
    for (const row of await db.from('pages').whereIn('id', ids)) {
      found.set(row.id, {
        label: row.title,
        detail: row.path === 'home' ? '/' : `/${row.path}`,
        href: `/admin/pages/${row.id}/edit`,
        status: row.status,
        trashed: Boolean(row.deleted_at),
      })
    }
  } else if (ownerType === 'entry') {
    const rows = await db
      .from('entries')
      .join('collections', 'collections.id', 'entries.collection_id')
      .whereIn('entries.id', ids)
      .select(
        'entries.id',
        'entries.title',
        'entries.status',
        'entries.deleted_at',
        'entries.collection_id',
        'collections.name as collection_name'
      )
    for (const row of rows) {
      found.set(row.id, {
        label: row.title,
        detail: row.collection_name,
        href: `/admin/collections/${row.collection_id}/entries/${row.id}/edit`,
        status: row.status,
        trashed: Boolean(row.deleted_at),
      })
    }
  } else {
    for (const row of await db.from('globals').whereIn('id', ids)) {
      found.set(row.id, {
        label: row.name,
        detail: `globals/${row.slug}`,
        href: `/admin/globals/${row.id}/edit`,
        status: null,
        trashed: Boolean(row.deleted_at),
      })
    }
  }
  return found
}

export async function usedBy(
  refType: RefType,
  refId: string | number,
  options: { kind?: string; includeTrashed?: boolean } = {}
): Promise<Usage[]> {
  const query = db
    .from('content_references')
    .where('ref_type', refType)
    .where('ref_id', String(refId))
    .orderBy('id')
  if (options.kind) query.where('kind', options.kind)
  const rows = await query

  const grouped = new Map<
    string,
    { ownerType: OwnerType; ownerId: number; kinds: Set<string>; positions: Set<number> }
  >()
  for (const row of rows) {
    const key = `${row.owner_type}:${row.owner_id}`
    const group = grouped.get(key) ?? {
      ownerType: row.owner_type,
      ownerId: row.owner_id,
      kinds: new Set(),
      positions: new Set(),
    }
    group.kinds.add(row.kind)
    if (row.position >= 0) group.positions.add(row.position)
    grouped.set(key, group)
  }

  const loaded: Record<OwnerType, Map<number, Owner>> = {
    page: new Map(),
    entry: new Map(),
    global: new Map(),
  }
  for (const ownerType of Object.keys(TABLES) as OwnerType[]) {
    const ids = [...grouped.values()].filter((g) => g.ownerType === ownerType).map((g) => g.ownerId)
    loaded[ownerType] = await owners(ownerType, ids)
  }

  const usages: Usage[] = []
  for (const group of grouped.values()) {
    const owner = loaded[group.ownerType]?.get(group.ownerId)
    if (!owner) continue
    if (owner.trashed && options.includeTrashed === false) continue
    usages.push({
      ownerType: group.ownerType,
      ownerId: group.ownerId,
      ...owner,
      kinds: [...group.kinds],
      positions: [...group.positions].sort((a, b) => a - b),
    })
  }
  const order: Record<OwnerType, number> = { page: 0, entry: 1, global: 2 }
  return usages.sort(
    (a, b) => order[a.ownerType] - order[b.ownerType] || a.label.localeCompare(b.label)
  )
}

export async function usageCounts(refType: RefType, refIds: (string | number)[]) {
  const counts = new Map<string, Record<OwnerType, number>>()
  for (const id of refIds) counts.set(String(id), { page: 0, entry: 0, global: 0 })
  if (!refIds.length) return counts
  const rows = await db
    .from('content_references as r')
    .leftJoin('pages', (join) => join.on('pages.id', 'r.owner_id').andOnVal('r.owner_type', 'page'))
    .leftJoin('entries', (join) =>
      join.on('entries.id', 'r.owner_id').andOnVal('r.owner_type', 'entry')
    )
    .leftJoin('globals', (join) =>
      join.on('globals.id', 'r.owner_id').andOnVal('r.owner_type', 'global')
    )
    .where('r.ref_type', refType)
    .whereIn(
      'r.ref_id',
      refIds.map((id) => String(id))
    )
    .where((query) =>
      query.whereNotNull('pages.id').orWhereNotNull('entries.id').orWhereNotNull('globals.id')
    )
    .groupBy('r.ref_id', 'r.owner_type')
    .select('r.ref_id', 'r.owner_type')
    .countDistinct('r.owner_id as total')
  for (const row of rows) {
    const entry = counts.get(String(row.ref_id))
    if (entry) entry[row.owner_type as OwnerType] = Number(row.total)
  }
  return counts
}

export async function isReferenced(refType: RefType, refId: string | number) {
  const usages = await usedBy(refType, refId)
  return usages.length > 0
}
