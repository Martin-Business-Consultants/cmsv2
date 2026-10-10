import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import logger from '@adonisjs/core/services/logger'
import type { QueryClientContract, TransactionClientContract } from '@adonisjs/lucid/types/database'
import { plugins, type SearchDocument } from '#services/plugins'

export const MIN_LENGTH = 3
export const TABLE = 'search_index'
const BODY_LIMIT = 20_000

type Client = QueryClientContract | TransactionClientContract | typeof db

type Indexable = { id: number; $trx?: TransactionClientContract } & Record<string, any>

export type CoreKind =
  'page' | 'entry' | 'collection' | 'global' | 'block_type' | 'redirect' | 'user' | 'role'

export type SearchKind = { kind: string; label: string; capability: string; plugin: string | null }

export const CORE_KINDS: SearchKind[] = [
  { kind: 'page', label: 'Page', capability: 'pages:read', plugin: null },
  { kind: 'entry', label: 'Entry', capability: 'entries:read', plugin: null },
  { kind: 'collection', label: 'Collection', capability: 'collections:read', plugin: null },
  { kind: 'global', label: 'Global', capability: 'globals:read', plugin: null },
  { kind: 'block_type', label: 'Block type', capability: 'block_types:read', plugin: null },
  { kind: 'redirect', label: 'Redirect', capability: 'redirects:read', plugin: null },
  { kind: 'user', label: 'User', capability: 'users:read', plugin: null },
  { kind: 'role', label: 'Role', capability: 'roles:read', plugin: null },
]

const TABLES: Record<CoreKind, string> = {
  page: 'pages',
  entry: 'entries',
  collection: 'collections',
  global: 'globals',
  block_type: 'block_types',
  redirect: 'redirects',
  user: 'users',
  role: 'roles',
}

const SKIPPED_KEYS = new Set(['id', 'type', 'icon', 'variant', 'layout', 'style', 'align'])

export function searchKinds(): SearchKind[] {
  return [
    ...CORE_KINDS,
    ...plugins.enabled(plugins.searchables).map((definition) => ({
      kind: definition.kind,
      label: definition.label,
      capability: definition.capability,
      plugin: definition.plugin,
    })),
  ]
}

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

function stripHtml(text: string) {
  if (!/<[a-z!/]/i.test(text)) return text
  return text
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

export function textOf(value: unknown, depth = 0): string[] {
  if (depth > 24 || value === null || value === undefined) return []
  if (typeof value === 'string') {
    const text = stripHtml(value).trim()
    return text ? [text] : []
  }
  if (Array.isArray(value)) return value.flatMap((item) => textOf(item, depth + 1))
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, item]) =>
      SKIPPED_KEYS.has(key) ? [] : textOf(item, depth + 1)
    )
  }
  return []
}

function join(...parts: unknown[]) {
  return parts
    .flatMap((part) => textOf(part))
    .join('\n\n')
    .slice(0, BODY_LIMIT)
}

function blocksText(blocks: unknown) {
  return parse<{ data?: unknown }[]>(blocks, [])
    .filter((block) => block && typeof block === 'object')
    .map((block) => block.data ?? {})
}

function field<T = unknown>(record: Record<string, any>, camel: string, snake: string): T {
  return (record[camel] ?? record[snake]) as T
}

async function documentFor(
  kind: CoreKind,
  record: Indexable,
  client: Client
): Promise<SearchDocument | null> {
  const id = Number(record.id)
  switch (kind) {
    case 'page':
      return {
        id,
        title: record.title ?? '',
        body: join(record.path, blocksText(record.blocks), parse(record.frontmatter, {})),
      }
    case 'entry': {
      const collectionId = field<number>(record, 'collectionId', 'collection_id')
      const collection = collectionId
        ? await client.from('collections').where('id', collectionId).select('slug').first()
        : null
      return {
        id,
        title: record.title ?? '',
        body: join(
          record.slug,
          collection?.slug,
          blocksText(record.blocks),
          parse(record.body, null),
          parse(record.data, {})
        ),
      }
    }
    case 'collection':
      return { id, title: record.name ?? '', body: join(record.slug, record.description) }
    case 'global':
      return {
        id,
        title: record.name ?? '',
        body: join(record.slug, record.description, parse(record.data, {})),
      }
    case 'block_type':
      return {
        id,
        title: record.label ?? '',
        body: join(record.slug, record.category, record.description),
      }
    case 'redirect':
      return {
        id,
        title: field<string>(record, 'sourcePath', 'source_path') ?? '',
        body: join(field(record, 'destinationUrl', 'destination_url'), record.notes),
      }
    case 'user': {
      const name = field<string | null>(record, 'fullName', 'full_name')
      return { id, title: name || record.email || '', body: join(record.email) }
    }
    case 'role':
      return { id, title: record.name ?? '', body: join(record.description) }
  }
}

async function write(client: Client, kind: string, document: SearchDocument) {
  await client.from(TABLE).where('record_type', kind).where('record_id', document.id).delete()
  await client.table(TABLE).insert({
    record_type: kind,
    record_id: document.id,
    title: String(document.title ?? '').slice(0, 500),
    body: String(document.body ?? '').slice(0, BODY_LIMIT),
  })
}

function trashed(record: Indexable) {
  return Boolean(record.deletedAt ?? record.deleted_at)
}

export async function indexSearch(kind: CoreKind, record: Indexable) {
  const client = record.$trx ?? db
  try {
    if (trashed(record)) {
      await client.from(TABLE).where('record_type', kind).where('record_id', record.id).delete()
      return
    }
    const document = await documentFor(kind, record, client)
    if (document) await write(client, kind, document)
  } catch (error) {
    logger.error({ err: error, kind, id: record.id }, 'Could not update the search index')
  }
}

export async function unindexSearch(kind: string, id: number, client?: Client) {
  try {
    await (client ?? db).from(TABLE).where('record_type', kind).where('record_id', id).delete()
  } catch (error) {
    logger.error({ err: error, kind, id }, 'Could not remove a record from the search index')
  }
}

export async function indexSearchDocument(kind: string, document: SearchDocument) {
  try {
    await write(db, kind, document)
  } catch (error) {
    logger.error({ err: error, kind, id: document.id }, 'Could not update the search index')
  }
}

export async function reindexAll() {
  const counts: Record<string, number> = {}
  await db.from(TABLE).delete()
  for (const kind of Object.keys(TABLES) as CoreKind[]) {
    const query = db.from(TABLES[kind]).select('*')
    if (kind === 'page' || kind === 'entry' || kind === 'global') query.whereNull('deleted_at')
    const rows = await query
    counts[kind] = 0
    for (const row of rows) {
      const document = await documentFor(kind, row, db)
      if (!document) continue
      await write(db, kind, document)
      counts[kind]++
    }
  }
  for (const definition of plugins.enabled(plugins.searchables)) {
    counts[definition.kind] = 0
    try {
      for (const document of await definition.documents()) {
        await write(db, definition.kind, document)
        counts[definition.kind]++
      }
    } catch (error) {
      logger.error({ err: error, kind: definition.kind }, 'Could not index a plugin kind')
    }
  }
  return counts
}

export function searchWords(term: string) {
  return term
    .trim()
    .split(/\s+/)
    .filter((word) => [...word].length >= MIN_LENGTH)
}

export function isSearchable(term: string) {
  return term.trim().length >= MIN_LENGTH && searchWords(term).length > 0
}

function matchExpression(term: string) {
  return searchWords(term)
    .map((word) => `"${word.replace(/"/g, '""')}"`)
    .join(' AND ')
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function snippet(body: string, term: string, words: number) {
  const tokens = body.split(/\s+/).filter(Boolean)
  if (!tokens.length) return ''
  const needles = searchWords(term).map((word) => word.toLowerCase())
  const hit = tokens.findIndex((token) =>
    needles.some((needle) => token.toLowerCase().includes(needle))
  )
  const start = hit === -1 ? 0 : Math.max(0, Math.min(hit - 3, tokens.length - words))
  const end = Math.min(tokens.length, start + words)
  let text = escapeHtml(tokens.slice(start, end).join(' '))
  if (needles.length) {
    const pattern = new RegExp(
      `(${needles.map((needle) => escapeRegExp(escapeHtml(needle))).join('|')})`,
      'gi'
    )
    text = text.replace(pattern, '<mark>$1</mark>')
  }
  return `${start > 0 ? '…' : ''}${text}${end < tokens.length ? '…' : ''}`
}

export type SearchHit = {
  kind: string
  id: number
  title: string
  body: string
  rank: number
}

function matches(term: string, kinds: string[]) {
  return db
    .from(TABLE)
    .whereRaw(`${TABLE} MATCH ?`, [matchExpression(term)])
    .whereIn('record_type', kinds)
}

export async function countMatches(term: string, kinds: string[]) {
  if (!kinds.length || !isSearchable(term)) return 0
  const [row] = await matches(term, kinds).count('* as total')
  return Number(row?.total ?? 0)
}

export async function findMatches(
  term: string,
  kinds: string[],
  options: { offset?: number; limit?: number } = {}
): Promise<SearchHit[]> {
  if (!kinds.length || !isSearchable(term)) return []
  const query = matches(term, kinds)
    .select('record_type', 'record_id', 'title', 'body')
    .select(db.raw(`bm25(${TABLE}, 0.0, 0.0, 10.0, 1.0) as rank`))
    .orderBy('rank')
  if (options.limit !== undefined) query.limit(options.limit)
  if (options.offset) query.offset(options.offset)
  const rows = await query
  return rows.map((row: any) => ({
    kind: String(row.record_type),
    id: Number(row.record_id),
    title: String(row.title ?? ''),
    body: String(row.body ?? ''),
    rank: Number(row.rank),
  }))
}

export type GlobalResult = {
  kind: string
  kindLabel: string
  id: number
  title: string
  snippet: string
  href: string
  status: string | null
  detail: string | null
}

async function adminLinks(hits: SearchHit[]) {
  const ids = (kind: string) => hits.filter((hit) => hit.kind === kind).map((hit) => hit.id)
  const entryRows = ids('entry').length
    ? await db
        .from('entries')
        .join('collections', 'collections.id', 'entries.collection_id')
        .whereIn('entries.id', ids('entry'))
        .select('entries.id', 'entries.collection_id', 'entries.status', 'collections.name')
    : []
  const pageRows = ids('page').length
    ? await db.from('pages').whereIn('id', ids('page')).select('id', 'status', 'path')
    : []
  const entries = new Map(entryRows.map((row: any) => [Number(row.id), row]))
  const pages = new Map(pageRows.map((row: any) => [Number(row.id), row]))
  const searchables = new Map(
    plugins.enabled(plugins.searchables).map((definition) => [definition.kind, definition])
  )

  return (hit: SearchHit): Pick<GlobalResult, 'href' | 'status' | 'detail'> => {
    switch (hit.kind) {
      case 'page': {
        const page = pages.get(hit.id)
        return {
          href: `/admin/pages/${hit.id}/edit`,
          status: page?.status ?? null,
          detail: page ? (page.path === 'home' ? '/' : `/${page.path}`) : null,
        }
      }
      case 'entry': {
        const entry = entries.get(hit.id)
        return {
          href: entry
            ? `/admin/collections/${entry.collection_id}/entries/${hit.id}/edit`
            : '/admin/collections',
          status: entry?.status ?? null,
          detail: entry?.name ?? null,
        }
      }
      case 'collection':
        return { href: `/admin/collections/${hit.id}/entries`, status: null, detail: null }
      case 'global':
        return { href: `/admin/globals/${hit.id}/edit`, status: null, detail: null }
      case 'block_type':
        return { href: `/admin/block-types/${hit.id}/edit`, status: null, detail: null }
      case 'redirect':
        return {
          href: `/admin/redirects?search=${encodeURIComponent(hit.title)}`,
          status: null,
          detail: null,
        }
      case 'user':
        return { href: `/admin/users/${hit.id}/edit`, status: null, detail: null }
      case 'role':
        return { href: `/admin/roles/${hit.id}/edit`, status: null, detail: null }
      default: {
        const definition = searchables.get(hit.kind)
        return { href: definition ? definition.href(hit.id) : '/admin', status: null, detail: null }
      }
    }
  }
}

export class GlobalSearch {
  readonly term: string
  readonly kinds: SearchKind[]

  constructor(term: unknown, can: (capability: string) => boolean) {
    this.term = String(term ?? '')
      .trim()
      .slice(0, 200)
    this.kinds = searchKinds().filter((kind) => can(kind.capability))
  }

  get searchable() {
    return isSearchable(this.term) && this.kinds.length > 0
  }

  count() {
    return this.searchable
      ? countMatches(
          this.term,
          this.kinds.map((kind) => kind.kind)
        )
      : Promise.resolve(0)
  }

  async results(offset: number, limit: number, words = 16): Promise<GlobalResult[]> {
    if (!this.searchable) return []
    const hits = await findMatches(
      this.term,
      this.kinds.map((kind) => kind.kind),
      { offset, limit }
    )
    const link = await adminLinks(hits)
    const labels = new Map(this.kinds.map((kind) => [kind.kind, kind.label]))
    return hits.map((hit) => ({
      kind: hit.kind,
      kindLabel: labels.get(hit.kind) ?? hit.kind,
      id: hit.id,
      title: hit.title || 'Untitled',
      snippet: snippet(hit.body, this.term, words),
      ...link(hit),
    }))
  }
}

export const API_LIMIT = 25

async function allowedIds(
  table: 'pages' | 'entries',
  ids: number[],
  liveOnly: boolean
): Promise<Set<number>> {
  if (!ids.length) return new Set()
  const { applyLiveScope } = await import('#services/publishing')
  const query = db.from(table).whereIn('id', ids).whereNull('deleted_at').select('id')
  if (liveOnly) applyLiveScope(query as any)
  const rows = await query
  return new Set(rows.map((row: any) => Number(row.id)))
}

export async function apiSearch(term: string, can: (capability: string) => boolean) {
  const iso = (value: unknown) => {
    if (!value) return null
    const text = value instanceof Date ? value.toISOString() : String(value)
    const sql = DateTime.fromSQL(text, { zone: 'utc' })
    const parsed = sql.isValid ? sql : DateTime.fromISO(text, { zone: 'utc' })
    return parsed.isValid ? parsed.toUTC().toFormat("yyyy-MM-dd'T'HH:mm:ss'Z'") : null
  }

  async function ranked(kind: 'page' | 'entry', table: 'pages' | 'entries', prefix: string) {
    if (!can(`${prefix}:read`)) return []
    const hits = await findMatches(term, [kind])
    const allowed = await allowedIds(
      table,
      hits.map((hit) => hit.id),
      !can(`${prefix}:write`)
    )
    return hits.filter((hit) => allowed.has(hit.id)).slice(0, API_LIMIT)
  }

  const pageHits = await ranked('page', 'pages', 'pages')
  const entryHits = await ranked('entry', 'entries', 'entries')

  const pageRows = pageHits.length
    ? await db.from('pages').whereIn(
        'id',
        pageHits.map((hit) => hit.id)
      )
    : []
  const entryRows = entryHits.length
    ? await db
        .from('entries')
        .join('collections', 'collections.id', 'entries.collection_id')
        .whereIn(
          'entries.id',
          entryHits.map((hit) => hit.id)
        )
        .select('entries.*', 'collections.slug as collection_slug')
    : []
  const pagesById = new Map(pageRows.map((row: any) => [Number(row.id), row]))
  const entriesById = new Map(entryRows.map((row: any) => [Number(row.id), row]))

  return {
    pages: pageHits.flatMap((hit) => {
      const page = pagesById.get(hit.id)
      if (!page) return []
      return [
        {
          id: page.id,
          slug: page.slug ?? String(page.path).split('/').pop(),
          title: page.title,
          status: page.status,
          locale: page.locale ?? null,
          updated_at: iso(page.updated_at),
          snippet: snippet(hit.body, term, 12),
        },
      ]
    }),
    entries: entryHits.flatMap((hit) => {
      const entry = entriesById.get(hit.id)
      if (!entry) return []
      return [
        {
          id: entry.id,
          slug: entry.slug,
          collection_slug: entry.collection_slug,
          title: entry.title,
          status: entry.status,
          locale: entry.locale ?? null,
          updated_at: iso(entry.updated_at),
          snippet: snippet(hit.body, term, 12),
        },
      ]
    }),
  }
}
