import { errors } from '@vinejs/vine'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import type { HttpContext } from '@adonisjs/core/http'
import type { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'
import Collection from '#models/collection'
import Entry from '#models/entry'
import Tagging, { type TaggableType } from '#models/tagging'
import { defaultsFor } from '#services/fields'
import { audit } from '#services/audit'
import { announce } from '#services/events'
import type { Actor } from '#services/actor'

export const PAGE_CATEGORIES_SLUG = 'page-categories'
export const PAGE_TAGS_SLUG = 'page-tags'

export type TaxonomyTerm = { id: number; slug: string; title: string }

export type TermInput = { id?: number | null; title: string }

export type TaxonomyPool = { id: number; slug: string; name: string; terms: TaxonomyTerm[] }

export type TaxonomyEditor = {
  categories: TaxonomyPool | null
  tags: TaxonomyPool | null
  missing: { categories: string | null; tags: string | null }
  category: TaxonomyTerm | null
  selectedTags: TaxonomyTerm[]
}

export type Pools = { categories: Collection | null; tags: Collection | null }

export type RecordTaxonomy = { category: TaxonomyTerm | null; tags: TaxonomyTerm[] }

export type TaxonomyValues = {
  category?: TermInput | null
  tags?: TermInput[]
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)
}

function term(entry: Entry): TaxonomyTerm {
  return { id: entry.id, slug: entry.slug, title: entry.title }
}

function position(entry: Entry) {
  const value = Number((entry.data as Record<string, unknown> | null)?.position)
  return Number.isFinite(value) && (entry.data as Record<string, unknown>)?.position !== null
    ? value
    : Number.POSITIVE_INFINITY
}

export function orderTerms(entries: Entry[]) {
  return [...entries].sort(
    (a, b) => position(a) - position(b) || a.title.localeCompare(b.title, undefined)
  )
}

export async function pagePools(): Promise<Pools> {
  const pools = await Collection.query().whereIn('slug', [PAGE_CATEGORIES_SLUG, PAGE_TAGS_SLUG])
  return {
    categories: pools.find((pool) => pool.slug === PAGE_CATEGORIES_SLUG) ?? null,
    tags: pools.find((pool) => pool.slug === PAGE_TAGS_SLUG) ?? null,
  }
}

export async function collectionPools(collection: Collection): Promise<Pools> {
  const ids = [collection.categoriesCollectionId, collection.tagsCollectionId].filter(
    (id): id is number => !!id
  )
  const pools = ids.length ? await Collection.query().whereIn('id', ids) : []
  return {
    categories: pools.find((pool) => pool.id === collection.categoriesCollectionId) ?? null,
    tags: pools.find((pool) => pool.id === collection.tagsCollectionId) ?? null,
  }
}

export async function poolsFor(kind: TaggableType, collection?: Collection) {
  return kind === 'page' ? pagePools() : collectionPools(collection!)
}

async function publishedTerms(pool: Collection | null): Promise<TaxonomyPool | null> {
  if (!pool) return null
  const entries = await Entry.query()
    .where('collection_id', pool.id)
    .whereNull('deleted_at')
    .where('status', 'published')
    .limit(1000)
  return { id: pool.id, slug: pool.slug, name: pool.name, terms: orderTerms(entries).map(term) }
}

export async function taxonomyOf(
  kind: TaggableType,
  records: { id: number; categoryEntryId: number | null }[]
): Promise<Map<number, RecordTaxonomy>> {
  const out = new Map<number, RecordTaxonomy>()
  for (const record of records) out.set(record.id, { category: null, tags: [] })
  if (!records.length) return out
  const taggings = await Tagging.query()
    .where('taggable_type', kind)
    .whereIn(
      'taggable_id',
      records.map((record) => record.id)
    )
    .orderBy('position')
    .orderBy('id')
  const termIds = [
    ...new Set([
      ...taggings.map((tagging) => tagging.tagEntryId),
      ...records.map((record) => record.categoryEntryId).filter((id): id is number => !!id),
    ]),
  ]
  const found = termIds.length
    ? await Entry.query().whereIn('id', termIds).whereNull('deleted_at')
    : []
  const terms = new Map(found.map((entry) => [entry.id, term(entry)]))
  for (const record of records) {
    const tags = taggings
      .filter((tagging) => tagging.taggableId === record.id)
      .map((tagging) => terms.get(tagging.tagEntryId))
      .filter((value): value is TaxonomyTerm => !!value)
    out.set(record.id, {
      category: record.categoryEntryId ? (terms.get(record.categoryEntryId) ?? null) : null,
      tags,
    })
  }
  return out
}

export async function taxonomyFor(
  kind: TaggableType,
  record: { id: number; categoryEntryId: number | null }
) {
  const all = await taxonomyOf(kind, [record])
  return all.get(record.id)!
}

export async function taxonomyEditorProps(
  kind: TaggableType,
  pools: Pools,
  record?: { id: number; categoryEntryId: number | null }
): Promise<TaxonomyEditor> {
  const [categories, tags, current] = await Promise.all([
    publishedTerms(pools.categories),
    publishedTerms(pools.tags),
    record ? taxonomyFor(kind, record) : Promise.resolve({ category: null, tags: [] }),
  ])
  return {
    categories,
    tags,
    missing: {
      categories: pools.categories ? null : kind === 'page' ? PAGE_CATEGORIES_SLUG : null,
      tags: pools.tags ? null : kind === 'page' ? PAGE_TAGS_SLUG : null,
    },
    category: current.category,
    selectedTags: current.tags,
  }
}

function fail(field: string, message: string): never {
  throw new errors.E_VALIDATION_ERROR([{ field, message, rule: 'taxonomy' }])
}

type Plan = {
  category?: { id: number } | { create: string } | null
  tags?: ({ id: number } | { create: string })[]
}

async function planTerms(
  kind: TaggableType,
  pool: Collection | null,
  inputs: TermInput[],
  field: 'category' | 'tags',
  user: Pick<Actor, 'can'>
) {
  const missingName =
    kind === 'page' ? (field === 'category' ? PAGE_CATEGORIES_SLUG : PAGE_TAGS_SLUG) : null
  if (!inputs.length) return []
  if (!pool) {
    fail(
      field,
      missingName
        ? `Can't be set: no '${missingName}' collection exists`
        : `Can't be set: this collection has no ${field === 'category' ? 'category' : 'tag'} pool`
    )
  }
  const ids = inputs.map((input) => input.id).filter((id): id is number => !!id)
  const found = ids.length ? await Entry.query().whereIn('id', ids).whereNull('deleted_at') : []
  if (found.some((entry) => entry.collectionId !== pool.id) || found.length < new Set(ids).size) {
    fail(
      field,
      field === 'category'
        ? `Must come from the '${pool.slug}' collection`
        : `Must all come from the '${pool.slug}' collection`
    )
  }
  const plan: ({ id: number } | { create: string })[] = []
  for (const input of inputs) {
    if (input.id) {
      plan.push({ id: input.id })
      continue
    }
    const slug = slugify(input.title)
    if (!slug) fail(field, `“${input.title}” needs at least one letter or digit`)
    const existing = await Entry.query()
      .where('collection_id', pool.id)
      .where('slug', slug)
      .whereNull('deleted_at')
      .first()
    if (existing) {
      plan.push({ id: existing.id })
      continue
    }
    if (!user.can('entries:write') || !user.can('entries:publish')) {
      fail(
        field,
        `Your role can't add new ${field === 'category' ? 'categories' : 'tags'}; pick an existing one`
      )
    }
    plan.push({ create: input.title })
  }
  const seen = new Set<string>()
  return plan.filter((item) => {
    const key = 'id' in item ? `id:${item.id}` : `new:${slugify(item.create)}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export async function planTaxonomy(
  kind: TaggableType,
  pools: Pools,
  values: TaxonomyValues,
  user: Pick<Actor, 'can'>
): Promise<Plan> {
  const plan: Plan = {}
  if (values.category !== undefined) {
    const [category] = values.category
      ? await planTerms(kind, pools.categories, [values.category], 'category', user)
      : []
    plan.category = category ?? null
  }
  if (values.tags !== undefined) {
    plan.tags = await planTerms(kind, pools.tags, values.tags, 'tags', user)
  }
  return plan
}

async function createTerm(pool: Collection, title: string, ctx: HttpContext) {
  const entry = await Entry.create({
    collectionId: pool.id,
    title,
    slug: slugify(title),
    status: 'published',
    publishedAt: DateTime.now(),
    data: defaultsFor(pool.fields ?? []),
    blocks: [],
    body: null,
    seo: {},
  })
  entry.$setRelated('collection', pool)
  await audit(ctx, 'entry.created', entry, { collection: pool.slug, status: entry.status })
  await announce('entry.created', entry, { origin: ctx })
  return entry.id
}

async function realize(
  item: { id: number } | { create: string },
  pool: Collection | null,
  ctx: HttpContext
) {
  return 'id' in item ? item.id : createTerm(pool!, item.create, ctx)
}

export async function applyCategory(
  record: { categoryEntryId: number | null },
  plan: Plan,
  pools: Pools,
  ctx: HttpContext
) {
  if (plan.category === undefined) return
  record.categoryEntryId = plan.category
    ? await realize(plan.category, pools.categories, ctx)
    : null
}

export async function syncTags(
  kind: TaggableType,
  id: number,
  plan: Plan,
  pools: Pools,
  ctx: HttpContext
) {
  if (plan.tags === undefined) return
  const ids: number[] = []
  for (const item of plan.tags) ids.push(await realize(item, pools.tags, ctx))
  await setTags(kind, id, ids)
}

export async function setTags(kind: TaggableType, id: number, tagIds: number[]) {
  await db.transaction(async (trx) => {
    await trx.from('taggings').where('taggable_type', kind).where('taggable_id', id).delete()
    const now = DateTime.now().toSQL({ includeOffset: false })
    if (tagIds.length) {
      await trx.table('taggings').multiInsert(
        [...new Set(tagIds)].map((tagId, index) => ({
          taggable_type: kind,
          taggable_id: id,
          tag_entry_id: tagId,
          position: index,
          created_at: now,
          updated_at: now,
        }))
      )
    }
  })
}

export async function copyTaxonomy(kind: TaggableType, fromId: number, toId: number) {
  const taggings = await Tagging.query()
    .where('taggable_type', kind)
    .where('taggable_id', fromId)
    .orderBy('position')
  await setTags(
    kind,
    toId,
    taggings.map((tagging) => tagging.tagEntryId)
  )
}

export async function removeTaggings(kind: TaggableType, ids: number[]) {
  if (!ids.length) return
  await db.from('taggings').where('taggable_type', kind).whereIn('taggable_id', ids).delete()
}

export function parseTagFilter(value: unknown) {
  return String(value ?? '')
    .split(',')
    .map((slug) => slug.trim().toLowerCase())
    .filter(Boolean)
}

export async function applyTagFilter(
  query: ModelQueryBuilderContract<typeof Entry, Entry>,
  collection: Collection,
  filterTags: unknown
) {
  const slugs = parseTagFilter(filterTags)
  if (!slugs.length || !collection.tagsCollectionId) return
  const tags = await Entry.query()
    .where('collection_id', collection.tagsCollectionId)
    .whereIn('slug', slugs)
    .whereNull('deleted_at')
  const tagIds = [...new Set(tags.map((tag) => tag.id))]
  if (!tagIds.length) return
  query.whereIn(
    'id',
    db
      .from('taggings')
      .select('taggable_id')
      .where('taggable_type', 'entry')
      .whereIn('tag_entry_id', tagIds)
      .groupBy('taggable_id')
      .havingRaw('count(distinct tag_entry_id) = ?', [tagIds.length])
  )
}

export type TaxonomyGroup<T> = { key: string; label: string; entries: T[] }

export async function groupByTaxonomy<
  T extends { category?: TaxonomyTerm | null; tags?: TaxonomyTerm[] },
>(collection: Collection, entries: T[], key: 'category' | 'tags'): Promise<TaxonomyGroup<T>[]> {
  const poolId =
    key === 'category' ? collection.categoriesCollectionId : collection.tagsCollectionId
  if (!poolId) return []
  const terms = orderTerms(
    await Entry.query()
      .where('collection_id', poolId)
      .where('status', 'published')
      .whereNull('deleted_at')
  )
  return terms
    .map((ref) => ({
      key: ref.slug,
      label: ref.title,
      entries: entries.filter((entry) =>
        key === 'tags'
          ? (entry.tags ?? []).some((tag) => tag.slug === ref.slug)
          : entry.category?.slug === ref.slug
      ),
    }))
    .filter((group) => group.entries.length > 0)
}

export async function assertPoolChoice(
  collection: Collection | null,
  categoriesSlug: string | null | undefined,
  tagsSlug: string | null | undefined
) {
  const resolve = async (slug: string | null | undefined, field: string) => {
    if (!slug) return null
    const pool = await Collection.findBy('slug', slug)
    if (!pool) fail(field, `No collection "${slug}"`)
    if (collection && pool.id === collection.id) fail(field, "A collection can't be its own pool")
    return pool.id
  }
  return {
    categoriesCollectionId: await resolve(categoriesSlug, 'categoriesCollection'),
    tagsCollectionId: await resolve(tagsSlug, 'tagsCollection'),
  }
}

export async function poolSlugs(collection: Collection) {
  const pools = await collectionPools(collection)
  return { categories: pools.categories?.slug ?? null, tags: pools.tags?.slug ?? null }
}

export async function poolUsers(collection: Collection) {
  return Collection.query()
    .where('categories_collection_id', collection.id)
    .orWhere('tags_collection_id', collection.id)
}
