import type { HttpContext } from '@adonisjs/core/http'
import Collection from '#models/collection'
import Entry from '#models/entry'
import CollectionTransformer from '#transformers/collection_transformer'
import EntryTransformer from '#transformers/entry_transformer'
import { entryValidator } from '#validators/entry'
import { recordMetaProps } from '#services/record_meta'
import { listLocaleFilter } from '#services/locales'
import { defaultsFor } from '#services/fields'
import { editorProps } from '#services/blocks'
import { findEntry } from '#services/entries'
import {
  applySearch,
  applySort,
  countBy,
  countOf,
  listParams,
  paginate,
  statusCounts,
} from '#services/listing'
import { STATUSES } from '#types/content'
import { entryApiPreview } from '#services/api_preview'
import { boardOf, booleanFields, fieldLabel, flagsOf } from '#services/board'
import { assertFresh, savedMessage } from '#services/publishing'
import { createEntry, trashEntry, updateEntry } from '#services/entry_editing'

export default class EntriesController {
  async index({ inertia, request, params, bouncer }: HttpContext) {
    await bouncer.authorize('access', 'entries:read')
    const collection = await Collection.findOrFail(params.collectionId)
    const qs = request.qs()
    const list = listParams(qs, {
      sorts: { title: 'title', slug: 'slug', status: 'status', updated: 'updated_at' },
      sort: 'updated',
      order: 'desc',
    })
    const status = (STATUSES as readonly string[]).includes(qs.status) ? String(qs.status) : ''

    const base = Entry.query().where('collection_id', collection.id).whereNull('deleted_at')
    const locales = await listLocaleFilter(qs, () =>
      Entry.query().where('collection_id', collection.id).whereNull('deleted_at')
    )
    if (locales.locale) base.where('locale', locales.locale)
    const query = applySearch(base.clone(), list.search, ['title', 'slug'])
    if (status) query.where('status', status)
    applySort(query, list)

    const [counts, trashed, { rows, meta }] = await Promise.all([
      countBy(base, 'status'),
      countOf(Entry.query().where('collection_id', collection.id).whereNotNull('deleted_at')),
      paginate(query, list.page),
    ])
    rows.forEach((entry) => entry.$setRelated('collection', collection))

    return inertia.render('admin/entries/index', {
      collection: CollectionTransformer.transform(collection),
      entries: EntryTransformer.transform(rows).useVariant('forList'),
      meta,
      counts: { ...statusCounts(counts, [...STATUSES]), trash: trashed },
      filters: {
        search: list.search,
        status,
        sort: list.sorted ? list.sort : '',
        order: list.order,
        locale: locales.locale,
      },
      locales: { available: locales.locales, defaultLocale: locales.defaultLocale },
      flagFields: booleanFields(collection).map((field) => ({
        name: field.name,
        label: fieldLabel(field),
      })),
      flags: flagsOf(rows, booleanFields(collection)),
      hasBoard: Boolean(boardOf(collection)),
    })
  }

  async create({ inertia, params, bouncer }: HttpContext) {
    await bouncer.authorize('access', 'entries:write')
    const collection = await Collection.findOrFail(params.collectionId)

    return inertia.render('admin/entries/create', {
      collection: CollectionTransformer.transform(collection),
      defaults: defaultsFor(collection.fields),
      ...(await editorProps()),
      ...(await recordMetaProps('entry', undefined, collection)),
    })
  }

  async store(ctx: HttpContext) {
    const { request, response, params, bouncer, session } = ctx
    await bouncer.authorize('access', 'entries:write')
    const collection = await Collection.findOrFail(params.collectionId)
    const values = await request.validateUsing(entryValidator)
    const entry = await createEntry(ctx, collection, values)

    session.flash('success', savedMessage(collection.singularName, entry, 'draft', 'created'))
    return response.redirect().toRoute('admin.entries.edit', {
      collectionId: collection.id,
      id: entry.id,
    })
  }

  async edit({ inertia, params, bouncer }: HttpContext) {
    await bouncer.authorize('access', 'entries:read')
    const collection = await Collection.findOrFail(params.collectionId)
    const entry = await findEntry(collection, params.id)
    const versions = await entry.related('versions').query().count('* as total')

    return inertia.render('admin/entries/edit', {
      collection: CollectionTransformer.transform(collection),
      entry: EntryTransformer.transform(entry),
      ...(await editorProps()),
      versionsCount: Number(versions[0].$extras.total),
      apiPreview: inertia.optional(() => entryApiPreview(entry, collection)),
      ...(await recordMetaProps('entry', entry, collection)),
    })
  }

  async update(ctx: HttpContext) {
    const { request, response, params, bouncer, session } = ctx
    await bouncer.authorize('access', 'entries:write')
    const collection = await Collection.findOrFail(params.collectionId)
    const entry = await findEntry(collection, params.id)

    const values = await request.validateUsing(entryValidator)
    assertFresh(entry, values.lockVersion)
    const { from } = await updateEntry(ctx, collection, entry, values)

    session.flash('success', savedMessage(collection.singularName, entry, from, 'saved'))
    return response.redirect().back()
  }

  async destroy(ctx: HttpContext) {
    const { params, response, bouncer, session } = ctx
    await bouncer.authorize('access', 'entries:delete')
    const collection = await Collection.findOrFail(params.collectionId)
    const entry = await findEntry(collection, params.id)
    await trashEntry(ctx, collection, entry)

    session.flash('success', `${collection.singularName} moved to trash`)
    return response.redirect().toRoute('admin.entries.index', { collectionId: collection.id })
  }
}
