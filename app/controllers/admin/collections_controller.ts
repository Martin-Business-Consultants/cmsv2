import type { HttpContext } from '@adonisjs/core/http'
import { errors } from '@vinejs/vine'
import Collection from '#models/collection'
import CollectionTransformer from '#transformers/collection_transformer'
import { collectionValidator } from '#validators/collection'
import { assertPoolChoice, poolSlugs } from '#services/taxonomy'
import { assertValid, normalizeDefinitions, validateDefinitions } from '#services/fields'
import { editorProps } from '#services/blocks'
import { audit } from '#services/audit'
import { collectionTemplateOptions, prepareCollection } from '#services/templates'
import { applySearch, applySort, countOf, listParams, paginate } from '#services/listing'
import { buildConfigErrors, normalizeBuildConfig } from '#services/board'
import {
  normalizeNotificationEvents,
  notificationEmailErrors,
} from '#services/collection_notifications'
import type { Field } from '#types/content'

type BoardValues = {
  buildConfig?: Record<string, unknown> | null
  notificationEvents?: string[]
  notificationEmails?: string | null
}

function boardSettings(values: BoardValues, fields: Field[], current?: Collection) {
  const buildConfig =
    values.buildConfig === undefined
      ? (current?.buildConfig ?? {})
      : normalizeBuildConfig(values.buildConfig)
  assertValid([
    ...buildConfigErrors(buildConfig, fields),
    ...notificationEmailErrors(values.notificationEmails),
  ])
  return {
    buildConfig,
    notificationEvents:
      values.notificationEvents === undefined
        ? (current?.notificationEvents ?? [])
        : normalizeNotificationEvents(values.notificationEvents),
    notificationEmails:
      values.notificationEmails === undefined
        ? (current?.notificationEmails ?? null)
        : values.notificationEmails || null,
  }
}

async function assertUnique(
  column: 'slug' | 'url_prefix',
  field: string,
  value: string | null | undefined,
  exceptId?: number
) {
  if (!value) return
  const query = Collection.query().where(column, value)
  if (exceptId) query.whereNot('id', exceptId)
  if (await query.first()) {
    const message =
      field === 'slug'
        ? 'Another collection already uses this slug'
        : 'Another collection already uses this URL prefix'
    throw new errors.E_VALIDATION_ERROR([{ field, message, rule: 'unique' }])
  }
}

async function activeEntriesCount(collection: Collection) {
  const result = await collection
    .related('entries')
    .query()
    .whereNull('deleted_at')
    .count('* as total')
  return Number(result[0].$extras.total)
}

export default class CollectionsController {
  async index({ inertia, request, bouncer, auth }: HttpContext) {
    await bouncer.authorize('access', 'collections:read')
    const list = listParams(request.qs(), {
      sorts: { name: 'name', slug: 'slug', entries: 'entries_count', updated: 'updated_at' },
      sort: 'name',
    })
    const query = applySearch(Collection.query(), list.search, ['name', 'slug', 'description'])
    query.withCount('entries', (entries) => entries.whereNull('deleted_at'))
    applySort(query, list)
    const [{ rows, meta }, total] = await Promise.all([
      paginate(query, list.page),
      countOf(Collection.query()),
    ])

    return inertia.render('admin/collections/index', {
      collections: CollectionTransformer.transform(rows),
      meta,
      total,
      templates: auth.use('web').user?.can('collections:write') ? collectionTemplateOptions() : [],
      filters: { search: list.search, sort: list.sorted ? list.sort : '', order: list.order },
    })
  }

  async create({ inertia, bouncer }: HttpContext) {
    await bouncer.authorize('access', 'collections:write')
    return inertia.render('admin/collections/create', await editorProps())
  }

  async store(ctx: HttpContext) {
    const { request, response, bouncer, session } = ctx
    await bouncer.authorize('access', 'collections:write')
    const prepared = prepareCollection(request.body())
    request.updateBody(prepared.values)
    const values = await request.validateUsing(collectionValidator)
    const fields = normalizeDefinitions(values.fields)
    assertValid(validateDefinitions(fields))
    const board = boardSettings(values, fields)
    await assertUnique('slug', 'slug', values.slug)
    await assertUnique('url_prefix', 'urlPrefix', values.urlPrefix)
    const pools = await assertPoolChoice(null, values.categoriesCollection, values.tagsCollection)

    const collection = await Collection.create({
      ...pools,
      name: values.name,
      singularName: values.singularName,
      slug: values.slug,
      description: values.description ?? null,
      icon: values.icon ?? null,
      urlPrefix: values.urlPrefix ?? null,
      fields,
      enableBlocks: values.enableBlocks ?? false,
      enableBody: values.enableBody ?? false,
      ...board,
    })
    await audit(ctx, 'collection.created', collection, {
      slug: collection.slug,
      ...(prepared.template ? { template: prepared.template.key } : {}),
    })

    session.flash('success', 'Collection created')
    return response.redirect().toRoute('admin.collections.edit', { id: collection.id })
  }

  async edit({ inertia, params, bouncer }: HttpContext) {
    await bouncer.authorize('access', 'collections:read')
    const collection = await Collection.query()
      .where('id', params.id)
      .withCount('entries', (query) => query.whereNull('deleted_at'))
      .firstOrFail()

    return inertia.render('admin/collections/edit', {
      collection: CollectionTransformer.transform(collection),
      ...(await editorProps()),
      pools: await poolSlugs(collection),
    })
  }

  async update(ctx: HttpContext) {
    const { request, response, params, bouncer, session } = ctx
    await bouncer.authorize('access', 'collections:write')
    const collection = await Collection.findOrFail(params.id)
    const values = await request.validateUsing(collectionValidator)
    const fields = normalizeDefinitions(values.fields)
    assertValid(validateDefinitions(fields))
    const board = boardSettings(values, fields, collection)
    await assertUnique('slug', 'slug', values.slug, collection.id)
    await assertUnique('url_prefix', 'urlPrefix', values.urlPrefix, collection.id)
    const pools = await assertPoolChoice(
      collection,
      values.categoriesCollection,
      values.tagsCollection
    )

    collection.merge({
      ...(values.categoriesCollection !== undefined
        ? { categoriesCollectionId: pools.categoriesCollectionId }
        : {}),
      ...(values.tagsCollection !== undefined ? { tagsCollectionId: pools.tagsCollectionId } : {}),
      name: values.name,
      singularName: values.singularName,
      slug: values.slug,
      description: values.description ?? null,
      icon: values.icon ?? null,
      urlPrefix: values.urlPrefix ?? null,
      fields,
      enableBlocks: values.enableBlocks ?? collection.enableBlocks,
      enableBody: values.enableBody ?? collection.enableBody,
      ...board,
    })
    await collection.save()
    await audit(ctx, 'collection.updated', collection)

    session.flash('success', 'Collection saved')
    return response.redirect().back()
  }

  async destroy(ctx: HttpContext) {
    const { params, response, bouncer, session } = ctx
    await bouncer.authorize('access', 'collections:delete')
    const collection = await Collection.findOrFail(params.id)
    const count = await activeEntriesCount(collection)
    if (count > 0) {
      session.flash(
        'error',
        `${collection.name} still has ${count} ${count === 1 ? 'entry' : 'entries'}. Move them to the trash first.`
      )
      return response.redirect().back()
    }

    await collection.delete()
    await audit(ctx, 'collection.deleted', collection)

    session.flash('success', 'Collection deleted')
    return response.redirect().toRoute('admin.collections.index')
  }
}
