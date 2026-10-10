import type { HttpContext } from '@adonisjs/core/http'
import { authorizeClient, notFound, respond } from '#services/delivery'
import Form from '../models/form.js'
import { resolveForm } from '../services/forms.js'
import { getFormsSettings } from '../services/settings.js'

export default class ApiFormsController {
  async index(ctx: HttpContext) {
    authorizeClient(ctx, 'forms:read')
    const settings = await getFormsSettings()
    const forms = await Form.query()
      .where('status', 'published')
      .whereNull('deleted_at')
      .orderBy('title')
    return respond(
      ctx,
      forms.map((form) => resolveForm(form, settings, { absolute: true }))
    )
  }

  async show(ctx: HttpContext) {
    authorizeClient(ctx, 'forms:read')
    const form = await Form.query()
      .where('slug', ctx.params.slug)
      .where('status', 'published')
      .whereNull('deleted_at')
      .first()
    if (!form) notFound(`No published form "${ctx.params.slug}"`)
    return respond(ctx, resolveForm(form, await getFormsSettings(), { absolute: true }))
  }
}
