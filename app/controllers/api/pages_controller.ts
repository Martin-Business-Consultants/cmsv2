import type { HttpContext } from '@adonisjs/core/http'
import Page from '#models/page'
import { getSettings } from '#services/settings'
import { localeParam } from '#services/locales'
import {
  authorizeClient,
  extrasFor,
  notFound,
  pageMeta,
  pagination,
  recordExtras,
  respond,
  serializePage,
  serializePageSummary,
} from '#services/delivery'

export default class PagesController {
  async index(ctx: HttpContext) {
    authorizeClient(ctx, 'pages:read')
    const { page, perPage } = pagination(ctx)
    const locale = await localeParam(ctx)
    const query = Page.query().withScopes((scopes) => scopes.live())
    if (locale) query.where('locale', locale)
    const pages = await query.orderBy('path').paginate(page, perPage)

    const extras = await recordExtras('page', pages.all())
    return respond(
      ctx,
      pages.all().map((row) => ({ ...serializePageSummary(row), ...extrasFor(extras, row.id) })),
      pageMeta(pages)
    )
  }

  async show(ctx: HttpContext) {
    authorizeClient(ctx, 'pages:read')
    const segments: string[] = ctx.params['*'] ?? []
    const path = segments.join('/').replace(/^\/+|\/+$/g, '') || 'home'
    const locale = await localeParam(ctx)
    const query = Page.query().withScopes((scopes) => scopes.live())
    const { homePageId, defaultLocale } = await getSettings()
    if (path === 'home' && homePageId && (!locale || locale === defaultLocale)) {
      query
        .where((q) => q.where('id', homePageId).orWhere('path', 'home'))
        .orderByRaw('case when id = ? then 0 else 1 end', [homePageId])
    } else {
      query.where('path', path)
    }
    if (locale) query.where('locale', locale)
    else query.orderByRaw('case when locale = ? then 0 else 1 end', [defaultLocale || 'en'])
    const page = await query.first()
    if (!page) notFound(`No live page at "${path}"`)

    return respond(ctx, await serializePage(page))
  }
}
