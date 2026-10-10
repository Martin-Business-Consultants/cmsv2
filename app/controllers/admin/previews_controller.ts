import type { HttpContext } from '@adonisjs/core/http'
import Page from '#models/page'
import Entry from '#models/entry'
import { entryProps, pageProps } from '#services/site'

export default class PreviewsController {
  async page({ inertia, params, bouncer }: HttpContext) {
    await bouncer.authorize('access', 'pages:read')
    const page = await Page.query().where('id', params.id).whereNull('deleted_at').firstOrFail()
    return inertia.render('site/page', await pageProps(page, { live: false }))
  }

  async entry({ inertia, params, bouncer }: HttpContext) {
    await bouncer.authorize('access', 'entries:read')
    const entry = await Entry.query()
      .where('id', params.id)
      .where('collection_id', params.collectionId)
      .whereNull('deleted_at')
      .preload('collection')
      .firstOrFail()
    return inertia.render('site/entry', await entryProps(entry, { live: false }))
  }
}
