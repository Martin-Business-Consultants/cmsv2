import type { HttpContext } from '@adonisjs/core/http'
import Webhook from '#models/webhook'
import { webhookValidator } from '#validators/webhook'
import { applySearch, applySort, listParams, paginate } from '#services/listing'
import {
  createWebhook,
  deleteWebhook,
  recentDeliveries,
  resolveWebhookValues,
  rotateSecret,
  sendTest,
  serializeDelivery,
  serializeWebhook,
  updateWebhook,
  webhookEventGroups,
} from '#services/webhooks'

type Sheet =
  | { mode: 'new' }
  | {
      mode: 'edit'
      webhook: ReturnType<typeof serializeWebhook> & { secret?: string }
      deliveries: ReturnType<typeof serializeDelivery>[]
    }

export default class WebhooksController {
  async index(ctx: HttpContext) {
    await ctx.bouncer.authorize('access', 'webhooks:read')
    return this.render(ctx, null)
  }

  async create(ctx: HttpContext) {
    await ctx.bouncer.authorize('access', 'webhooks:write')
    return this.render(ctx, { mode: 'new' })
  }

  async edit(ctx: HttpContext) {
    await ctx.bouncer.authorize('access', 'webhooks:read')
    const webhook = await Webhook.findOrFail(ctx.params.id)
    const canWrite = Boolean(ctx.auth.use('web').user?.can('webhooks:write'))
    const deliveries = await recentDeliveries(webhook)
    return this.render(ctx, {
      mode: 'edit',
      webhook: serializeWebhook(webhook, { secret: canWrite }),
      deliveries: deliveries.map(serializeDelivery),
    })
  }

  async store(ctx: HttpContext) {
    const { request, response, bouncer, session } = ctx
    await bouncer.authorize('access', 'webhooks:write')
    const input = await request.validateUsing(webhookValidator)
    const webhook = await createWebhook(await resolveWebhookValues(input), ctx)
    session.flash('success', 'Webhook created')
    return response.redirect().toPath(`/admin/webhooks/${webhook.id}/edit`)
  }

  async update(ctx: HttpContext) {
    const { request, response, params, bouncer, session } = ctx
    await bouncer.authorize('access', 'webhooks:write')
    const webhook = await Webhook.findOrFail(params.id)
    const input = await request.validateUsing(webhookValidator)
    await updateWebhook(webhook, await resolveWebhookValues(input), ctx)
    session.flash('success', 'Webhook saved')
    return response.redirect().toPath(`/admin/webhooks/${webhook.id}/edit`)
  }

  async destroy(ctx: HttpContext) {
    const { params, response, bouncer, session } = ctx
    await bouncer.authorize('access', 'webhooks:delete')
    const webhook = await Webhook.findOrFail(params.id)
    await deleteWebhook(webhook, ctx)
    session.flash('success', 'Webhook deleted')
    return response.redirect().toPath('/admin/webhooks')
  }

  async rotateSecret(ctx: HttpContext) {
    const { params, response, bouncer, session } = ctx
    await bouncer.authorize('access', 'webhooks:write')
    const webhook = await Webhook.findOrFail(params.id)
    await rotateSecret(webhook, ctx)
    session.flash('success', 'Signing secret rotated')
    return response.redirect().toPath(`/admin/webhooks/${webhook.id}/edit`)
  }

  async test(ctx: HttpContext) {
    const { params, response, bouncer, session } = ctx
    await bouncer.authorize('access', 'webhooks:write')
    const webhook = await Webhook.findOrFail(params.id)
    await sendTest(webhook, ctx)
    session.flash('success', 'Test delivery queued')
    return response.redirect().toPath(`/admin/webhooks/${webhook.id}/edit`)
  }

  private async render({ inertia, request }: HttpContext, sheet: Sheet | null) {
    const qs = request.qs()
    const list = listParams(qs, {
      sorts: { name: 'name', url: 'url', lastDelivery: 'last_delivery_at' },
      sort: 'name',
    })
    const query = applySearch(Webhook.query(), list.search, ['name', 'url'])
    applySort(query, list)
    const { rows, meta } = await paginate(query, list.page)
    return inertia.render('admin/webhooks/index', {
      webhooks: rows.map((webhook) => serializeWebhook(webhook)),
      meta,
      eventGroups: webhookEventGroups(),
      sheet,
      filters: { search: list.search, sort: list.sorted ? list.sort : '', order: list.order },
    })
  }
}
