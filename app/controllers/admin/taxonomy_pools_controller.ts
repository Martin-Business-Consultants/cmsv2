import type { HttpContext } from '@adonisjs/core/http'
import Collection from '#models/collection'
import { PAGE_CATEGORIES_SLUG, PAGE_TAGS_SLUG } from '#services/taxonomy'
import { audit } from '#services/audit'

const POOLS = [
  {
    slug: PAGE_CATEGORIES_SLUG,
    name: 'Page categories',
    singularName: 'Page category',
    icon: 'folder',
    description: 'Categories you can file pages under.',
  },
  {
    slug: PAGE_TAGS_SLUG,
    name: 'Page tags',
    singularName: 'Page tag',
    icon: 'tag',
    description: 'Tags you can put on pages.',
  },
]

export default class TaxonomyPoolsController {
  async pages(ctx: HttpContext) {
    const { response, bouncer, session } = ctx
    await bouncer.authorize('access', 'collections:write')
    const created: string[] = []
    for (const pool of POOLS) {
      if (await Collection.findBy('slug', pool.slug)) continue
      const collection = await Collection.create({
        ...pool,
        urlPrefix: null,
        fields: [],
        enableBlocks: false,
        enableBody: false,
      })
      await audit(ctx, 'collection.created', collection)
      created.push(collection.name)
    }
    session.flash(
      'success',
      created.length ? `Created ${created.join(' and ')}` : 'Page categories and tags already exist'
    )
    return response.redirect().back()
  }
}
