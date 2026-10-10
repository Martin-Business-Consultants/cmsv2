import type { LucidModel, ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'

export const PER_PAGE = 25

export type SortOrder = 'asc' | 'desc'

export type ListMeta = {
  total: number
  perPage: number
  currentPage: number
  lastPage: number
  firstRow: number
  lastRow: number
}

export type ListOptions = {
  sorts?: Record<string, string>
  sort?: string
  order?: SortOrder
}

export type ListParams = {
  page: number
  search: string
  sort: string
  order: SortOrder
  column: string | null
  sorted: boolean
}

type Query<Model extends LucidModel> = ModelQueryBuilderContract<Model, InstanceType<Model>>

export function text(value: unknown, max = 200) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

export function listParams(qs: Record<string, unknown>, options: ListOptions = {}): ListParams {
  const sorts = options.sorts ?? {}
  const requested = text(qs.sort)
  const sorted = Object.hasOwn(sorts, requested)
  const sort = sorted ? requested : (options.sort ?? '')
  const order: SortOrder =
    sorted && (qs.order === 'asc' || qs.order === 'desc') ? qs.order : (options.order ?? 'asc')

  return {
    page: Math.max(1, Math.floor(Number(qs.page)) || 1),
    search: text(qs.search),
    sort,
    order,
    column: Object.hasOwn(sorts, sort) ? sorts[sort] : null,
    sorted,
  }
}

export function likePattern(search: string) {
  return `%${search.replace(/[\\%_]/g, (char) => `\\${char}`)}%`
}

export function applySearch<Model extends LucidModel>(
  query: Query<Model>,
  search: string,
  columns: string[]
) {
  if (!search || !columns.length) return query
  const pattern = likePattern(search)
  return query.where((group) => {
    for (const column of columns) group.orWhereRaw(`${column} LIKE ? ESCAPE '\\'`, [pattern])
  })
}

export function applySort<Model extends LucidModel>(query: Query<Model>, params: ListParams) {
  if (params.column) query.orderBy(params.column, params.order)
  return query.orderBy('id', params.order)
}

export function metaFor(total: number, page: number, perPage = PER_PAGE): ListMeta {
  const lastPage = Math.max(1, Math.ceil(total / perPage))
  const currentPage = Math.min(Math.max(1, page), lastPage)
  const firstRow = total === 0 ? 0 : (currentPage - 1) * perPage + 1
  return {
    total,
    perPage,
    currentPage,
    lastPage,
    firstRow,
    lastRow: Math.min(total, currentPage * perPage),
  }
}

export async function paginate<Model extends LucidModel>(
  query: Query<Model>,
  page: number,
  perPage = PER_PAGE
) {
  let result = await query.clone().paginate(page, perPage)
  if (page > 1 && result.lastPage < page) {
    result = await query.clone().paginate(Math.max(1, result.lastPage), perPage)
  }
  return {
    rows: result.all() as InstanceType<Model>[],
    meta: metaFor(result.total, result.currentPage, perPage),
  }
}

export function paginateArray<T>(items: T[], page: number, perPage = PER_PAGE) {
  const meta = metaFor(items.length, page, perPage)
  return { rows: items.slice(meta.firstRow - 1, meta.lastRow), meta }
}

export async function countBy<Model extends LucidModel>(query: Query<Model>, column: string) {
  const rows = await query
    .clone()
    .clearOrder()
    .clearSelect()
    .select(column)
    .count('* as total')
    .groupBy(column)
    .pojo<Record<string, unknown>>()
  const counts: Record<string, number> = {}
  for (const row of rows) counts[String(row[column])] = Number(row.total)
  return counts
}

export async function countOf<Model extends LucidModel>(query: Query<Model>) {
  const rows = await query
    .clone()
    .clearOrder()
    .clearSelect()
    .count('* as total')
    .pojo<{ total: number }>()
  return Number(rows[0]?.total ?? 0)
}

export function statusCounts(counts: Record<string, number>, statuses: string[]) {
  return {
    all: Object.values(counts).reduce((sum, count) => sum + count, 0),
    ...Object.fromEntries(statuses.map((status) => [status, counts[status] ?? 0])),
  } as Record<string, number>
}

export function bulkMessage(done: number, noun: [string, string], verb: string, skipped = 0) {
  const name = (count: number) => (count === 1 ? noun[0] : noun[1])
  const parts = [`${done} ${name(done)} ${verb}`]
  if (skipped) parts.push(`${skipped} skipped`)
  return parts.join(', ')
}
