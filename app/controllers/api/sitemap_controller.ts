import type { HttpContext } from '@adonisjs/core/http'
import Collection from '#models/collection'
import Entry from '#models/entry'
import Page from '#models/page'
import { getSettings } from '#services/settings'
import { absoluteUrl, authorizeClient, iso, respond } from '#services/delivery'
import { liveTranslations, siteLocales } from '#services/locales'

export default class SitemapController {
  async show(ctx: HttpContext) {
    authorizeClient(ctx, 'pages:read')
    const { homePageId } = await getSettings()
    const pages = await Page.query()
      .withScopes((scopes) => scopes.live())
      .orderBy('path')
    const collections = await Collection.query()
      .whereNotNull('url_prefix')
      .whereNot('url_prefix', '')
    const entries = collections.length
      ? await Entry.query()
          .withScopes((scopes) => scopes.live())
          .whereIn(
            'collection_id',
            collections.map((collection) => collection.id)
          )
          .orderBy('published_at', 'desc')
      : []
    const byId = new Map(collections.map((collection) => [collection.id, collection]))
    entries.forEach((entry) => entry.$setRelated('collection', byId.get(entry.collectionId)!))
    await siteLocales()
    const [pageAlternates, entryAlternates] = await Promise.all([
      liveTranslations('page', pages),
      liveTranslations('entry', entries),
    ])
    const alternates = (links: { locale: string; path: string }[] | undefined) =>
      (links ?? []).map((link) => ({ locale: link.locale, url: absoluteUrl(link.path) }))

    const urls = [
      ...pages
        .filter((page) => !page.seo?.noindex)
        .map((page) => ({
          type: 'page',
          id: page.id,
          url: absoluteUrl(page.id === homePageId ? '/' : page.publicPath),
          lastmod: iso(page.updatedAt),
          locale: page.locale,
          alternates: alternates(pageAlternates.get(page.id)),
        })),
      ...entries
        .filter((entry) => !entry.seo?.noindex)
        .map((entry) => ({
          type: 'entry',
          id: entry.id,
          url: absoluteUrl(entry.publicPath!),
          lastmod: iso(entry.updatedAt),
          locale: entry.locale,
          alternates: alternates(entryAlternates.get(entry.id)),
        })),
    ]

    return respond(ctx, urls, { total: urls.length })
  }
}
