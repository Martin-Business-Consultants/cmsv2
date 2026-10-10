import type { HttpContext } from '@adonisjs/core/http'
import Redirect from '#models/redirect'
import { authorizeClient, respond, serializeRedirect } from '#services/delivery'

export default class RedirectsController {
  async index(ctx: HttpContext) {
    authorizeClient(ctx, 'redirects:read')
    const redirects = await Redirect.query().where('is_active', true).orderBy('source')
    return respond(ctx, redirects.map(serializeRedirect), { total: redirects.length })
  }
}
