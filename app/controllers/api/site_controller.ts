import type { HttpContext } from '@adonisjs/core/http'
import Collection from '#models/collection'
import Page from '#models/page'
import { getSettings } from '#services/settings'
import { ContentResolver } from '#services/content'
import { siteLocales } from '#services/locales'
import { authorizeClient, respond, serializeCollection, siteUrl } from '#services/delivery'

export default class SiteController {
  async show(ctx: HttpContext) {
    authorizeClient(ctx, 'pages:read')
    const settings = await getSettings()
    const resolver = new ContentResolver()
    const home = settings.homePageId
      ? await Page.query()
          .withScopes((scopes) => scopes.live())
          .where('id', settings.homePageId)
          .first()
      : null
    const collections = await Collection.query().orderBy('name')
    const { defaultLocale, locales } = await siteLocales()

    return respond(ctx, {
      name: settings.siteName,
      tagline: settings.tagline,
      url: siteUrl(),
      logo: await resolver.asset(settings.logoAssetId),
      favicon: await resolver.asset(settings.faviconAssetId),
      homePageId: home?.id ?? null,
      homePath: home?.publicPath ?? '/',
      contactEmail: settings.contactEmail || null,
      defaultLocale,
      locales,
      collections: collections.map(serializeCollection),
    })
  }
}
