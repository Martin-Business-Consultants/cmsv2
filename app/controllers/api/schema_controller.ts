import type { HttpContext } from '@adonisjs/core/http'
import BlockType from '#models/block_type'
import Collection from '#models/collection'
import Global from '#models/global'
import { jsonSchemaFor } from '#services/fields'
import { SEO_SCHEMA, authorizeClient, respond } from '#services/delivery'

export default class SchemaController {
  async show(ctx: HttpContext) {
    authorizeClient(ctx, 'block_types:read')
    const [blockTypes, collections, globals] = await Promise.all([
      BlockType.query().orderBy('slug'),
      Collection.query().orderBy('slug'),
      Global.query().whereNull('deleted_at').orderBy('slug'),
    ])

    return respond(ctx, {
      blocks: Object.fromEntries(
        blockTypes.map((type) => [
          type.slug,
          { title: type.label, description: type.description, ...jsonSchemaFor(type.fields ?? []) },
        ])
      ),
      collections: Object.fromEntries(
        collections.map((collection) => [
          collection.slug,
          { title: collection.name, ...jsonSchemaFor(collection.fields ?? []) },
        ])
      ),
      globals: Object.fromEntries(
        globals.map((global) => [
          global.slug,
          { title: global.name, ...jsonSchemaFor(global.fields ?? []) },
        ])
      ),
      seo: SEO_SCHEMA,
    })
  }
}
