import type { HttpContext } from '@adonisjs/core/http'
import Global from '#models/global'
import { ContentResolver } from '#services/content'
import { authorizeClient, iso, notFound, redactSecrets, respond } from '#services/delivery'

async function serializeGlobal(global: Global, resolver: ContentResolver) {
  return {
    slug: global.slug,
    name: global.name,
    description: global.description,
    data: redactSecrets(await resolver.data(global.fields ?? [], global.data ?? {})),
    updatedAt: iso(global.updatedAt),
  }
}

export default class GlobalsController {
  async index(ctx: HttpContext) {
    authorizeClient(ctx, 'globals:read')
    const globals = await Global.query().whereNull('deleted_at').orderBy('name')
    const resolver = new ContentResolver()
    const data = []
    for (const global of globals) data.push(await serializeGlobal(global, resolver))
    return respond(ctx, data)
  }

  async show(ctx: HttpContext) {
    authorizeClient(ctx, 'globals:read')
    const global = await Global.query()
      .whereNull('deleted_at')
      .where('slug', ctx.params.slug)
      .first()
    if (!global) notFound(`No global "${ctx.params.slug}"`)
    return respond(ctx, await serializeGlobal(global, new ContentResolver()))
  }
}
