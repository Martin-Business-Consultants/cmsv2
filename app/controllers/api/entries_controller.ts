import type { HttpContext } from '@adonisjs/core/http'
import Collection from '#models/collection'
import Entry from '#models/entry'
import { ContentResolver } from '#services/content'
import { localeParam, siteLocales } from '#services/locales'
import {
  authorizeClient,
  badRequest,
  notFound,
  pageMeta,
  pagination,
  recordExtras,
  respond,
  serializeEntry,
} from '#services/delivery'

const SORTS = ['newest', 'oldest', 'title'] as const

async function findCollection(slug: string) {
  const collection = await Collection.findBy('slug', slug)
  if (!collection) notFound(`No collection "${slug}"`)
  return collection
}

export default class EntriesController {
  async index(ctx: HttpContext) {
    authorizeClient(ctx, 'entries:read')
    const collection = await findCollection(ctx.params.slug)
    const { page, perPage } = pagination(ctx)
    const sort = String(ctx.request.qs().sort ?? 'newest')
    if (!SORTS.includes(sort as (typeof SORTS)[number])) {
      badRequest(`"sort" must be one of ${SORTS.join(', ')}`)
    }

    const query = Entry.query()
      .withScopes((scopes) => scopes.live())
      .where('collection_id', collection.id)
    const locale = await localeParam(ctx)
    if (locale) query.where('locale', locale)
    if (sort === 'title') query.orderBy('title', 'asc')
    else if (sort === 'oldest') query.orderBy('published_at', 'asc')
    else query.orderBy('published_at', 'desc')
    const entries = await query.orderBy('id', 'desc').paginate(page, perPage)

    const resolver = new ContentResolver()
    const extras = await recordExtras('entry', entries.all())
    const data = []
    for (const entry of entries.all()) {
      data.push(await serializeEntry(entry, collection, resolver, false, extras))
    }
    return respond(ctx, data, pageMeta(entries))
  }

  async show(ctx: HttpContext) {
    authorizeClient(ctx, 'entries:read')
    const collection = await findCollection(ctx.params.slug)
    const locale = await localeParam(ctx)
    const query = Entry.query()
      .withScopes((scopes) => scopes.live())
      .where('collection_id', collection.id)
      .where('slug', ctx.params.entrySlug)
    if (locale) query.where('locale', locale)
    else {
      const { defaultLocale } = await siteLocales()
      query.orderByRaw('case when locale = ? then 0 else 1 end', [defaultLocale])
    }
    const entry = await query.first()
    if (!entry) notFound(`No live entry "${ctx.params.entrySlug}" in "${collection.slug}"`)

    return respond(ctx, await serializeEntry(entry, collection))
  }
}
