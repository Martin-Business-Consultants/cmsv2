import type { HttpContext } from '@adonisjs/core/http'
import Redirect from '#models/redirect'
import RedirectTransformer from '#transformers/redirect_transformer'
import { redirectValidator } from '#validators/redirect'
import { audit } from '#services/audit'
import { applySearch, applySort, countBy, listParams, paginate } from '#services/listing'

export default class RedirectsController {
  async index({ inertia, request, bouncer }: HttpContext) {
    await bouncer.authorize('access', 'redirects:read')
    const qs = request.qs()
    const list = listParams(qs, {
      sorts: {
        source: 'source',
        destination: 'destination',
        hits: 'hits',
        lastHit: 'last_hit_at',
        updated: 'updated_at',
      },
      sort: 'source',
    })
    const state = qs.state === 'active' || qs.state === 'inactive' ? String(qs.state) : ''
    const base = Redirect.query()
    const query = applySearch(base.clone(), list.search, ['source', 'destination', 'notes'])
    if (state) query.where('is_active', state === 'active')
    applySort(query, list)
    const [{ rows, meta }, byState] = await Promise.all([
      paginate(query, list.page),
      countBy(base, 'is_active'),
    ])
    const active = (byState['1'] ?? 0) + (byState['true'] ?? 0)
    const inactive = (byState['0'] ?? 0) + (byState['false'] ?? 0)

    return inertia.render('admin/redirects/index', {
      redirects: RedirectTransformer.transform(rows),
      meta,
      counts: { all: active + inactive, active, inactive },
      filters: {
        search: list.search,
        state,
        sort: list.sorted ? list.sort : '',
        order: list.order,
      },
    })
  }

  async store(ctx: HttpContext) {
    const { request, response, bouncer, session } = ctx
    await bouncer.authorize('access', 'redirects:write')
    const values = await request.validateUsing(redirectValidator, { meta: {} })
    const redirect = await Redirect.create({ ...values, notes: values.notes || null, hits: 0 })
    await audit(ctx, 'redirect.created', redirect)

    session.flash('success', 'Redirect created')
    return response.redirect().back()
  }

  async update(ctx: HttpContext) {
    const { request, response, params, bouncer, session } = ctx
    await bouncer.authorize('access', 'redirects:write')
    const redirect = await Redirect.findOrFail(params.id)
    const values = await request.validateUsing(redirectValidator, { meta: { id: redirect.id } })
    const toggled = values.isActive !== redirect.isActive
    redirect.merge({ ...values, notes: values.notes || null })
    await redirect.save()
    await audit(ctx, 'redirect.updated', redirect, toggled ? { isActive: redirect.isActive } : {})

    session.flash('success', 'Redirect saved')
    return response.redirect().back()
  }

  async destroy(ctx: HttpContext) {
    const { params, response, bouncer, session } = ctx
    await bouncer.authorize('access', 'redirects:delete')
    const redirect = await Redirect.findOrFail(params.id)
    await redirect.delete()
    await audit(ctx, 'redirect.deleted', redirect)

    session.flash('success', 'Redirect deleted')
    return response.redirect().back()
  }
}
