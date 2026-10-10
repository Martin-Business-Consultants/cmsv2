import type { HttpContext } from '@adonisjs/core/http'
import Collection from '#models/collection'
import { authorizeClient, notFound, respond, serializeCollection } from '#services/delivery'

export default class CollectionsController {
  async index(ctx: HttpContext) {
    authorizeClient(ctx, 'collections:read')
    const collections = await Collection.query().orderBy('name')
    return respond(ctx, collections.map(serializeCollection))
  }

  async show(ctx: HttpContext) {
    authorizeClient(ctx, 'collections:read')
    const collection = await Collection.findBy('slug', ctx.params.slug)
    if (!collection) notFound(`No collection "${ctx.params.slug}"`)
    return respond(ctx, { ...serializeCollection(collection), fields: collection.fields ?? [] })
  }
}
