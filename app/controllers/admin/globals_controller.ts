import type { HttpContext } from '@adonisjs/core/http'
import Global from '#models/global'
import GlobalTransformer from '#transformers/global_transformer'
import { globalDataValidator, globalFieldsValidator, globalValidator } from '#validators/global'
import { editorProps } from '#services/blocks'
import { applySearch, applySort, countOf, listParams, paginate } from '#services/listing'
import { assertFresh, denyPublish } from '#services/publishing'
import {
  checkGlobalFields,
  createGlobal,
  trashGlobal,
  updateGlobal,
  updateGlobalFields,
} from '#services/global_editing'

function findGlobal(id: string | number) {
  return Global.query().where('id', id).whereNull('deleted_at').firstOrFail()
}

export default class GlobalsController {
  async index({ inertia, request, bouncer }: HttpContext) {
    await bouncer.authorize('access', 'globals:read')
    const list = listParams(request.qs(), {
      sorts: { name: 'name', slug: 'slug', updated: 'updated_at' },
      sort: 'name',
    })
    const base = Global.query().whereNull('deleted_at')
    const query = applySearch(base.clone(), list.search, ['name', 'slug', 'description'])
    applySort(query, list)
    const [{ rows, meta }, total, trashed] = await Promise.all([
      paginate(query, list.page),
      countOf(base),
      countOf(Global.query().whereNotNull('deleted_at')),
    ])

    return inertia.render('admin/globals/index', {
      globals: GlobalTransformer.transform(rows).useVariant('forList'),
      meta,
      counts: { all: total, trash: trashed },
      filters: { search: list.search, sort: list.sorted ? list.sort : '', order: list.order },
    })
  }

  async create({ inertia, bouncer }: HttpContext) {
    await bouncer.authorize('access', 'globals:write')
    return inertia.render('admin/globals/create', {})
  }

  async store(ctx: HttpContext) {
    const { request, response, bouncer, session } = ctx
    await bouncer.authorize('access', 'globals:write')
    const values = await request.validateUsing(globalValidator)
    const global = await createGlobal(ctx, values)

    session.flash('success', 'Global created. Define its fields.')
    return response
      .redirect()
      .toRoute('admin.globals.edit', { id: global.id }, { qs: { tab: 'fields' } })
  }

  async edit({ inertia, params, bouncer }: HttpContext) {
    await bouncer.authorize('access', 'globals:read')
    const global = await findGlobal(params.id)

    return inertia.render('admin/globals/edit', {
      global: GlobalTransformer.transform(global),
      ...(await editorProps()),
    })
  }

  async update(ctx: HttpContext) {
    const { request, response, params, bouncer, session } = ctx
    await bouncer.authorize('access', 'globals:write')
    const global = await findGlobal(params.id)
    if (!ctx.auth.use('web').user!.can('globals:publish')) denyPublish()

    const values = await request.validateUsing(globalDataValidator)
    assertFresh(global, values.lockVersion)
    await updateGlobal(ctx, global, values)

    session.flash('success', 'Global saved')
    return response.redirect().back()
  }

  async updateFields(ctx: HttpContext) {
    const { request, response, params, bouncer, session } = ctx
    await bouncer.authorize('access', 'globals:write')
    const global = await findGlobal(params.id)
    const values = await request.validateUsing(globalFieldsValidator)
    assertFresh(global, values.lockVersion)
    await updateGlobalFields(ctx, global, checkGlobalFields(values.fields))

    session.flash('success', 'Fields saved')
    return response.redirect().back()
  }

  async destroy(ctx: HttpContext) {
    const { params, response, bouncer, session } = ctx
    await bouncer.authorize('access', 'globals:delete')
    const global = await findGlobal(params.id)
    await trashGlobal(ctx, global)

    session.flash('success', 'Global moved to trash')
    return response.redirect().toRoute('admin.globals.index')
  }
}
