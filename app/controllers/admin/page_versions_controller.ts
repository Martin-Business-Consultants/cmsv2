import type { HttpContext } from '@adonisjs/core/http'
import Page from '#models/page'
import PageVersion from '#models/page_version'
import PageTransformer from '#transformers/page_transformer'
import PageVersionTransformer from '#transformers/page_version_transformer'
import { snapshot } from '#services/pages'
import { audit } from '#services/audit'
import { announce } from '#services/events'
import { listParams, paginate } from '#services/listing'
import {
  blockLabels,
  differsFromNow,
  pageCurrent,
  pageVersionSnapshot,
  versionDiff,
} from '#services/versions'

export default class PageVersionsController {
  async index({ inertia, params, request, bouncer }: HttpContext) {
    await bouncer.authorize('access', 'pages:read')
    const page = await Page.query().where('id', params.id).whereNull('deleted_at').firstOrFail()
    const { rows, meta } = await paginate(
      PageVersion.query().where('page_id', page.id).preload('user').orderBy('id', 'desc'),
      listParams(request.qs()).page
    )
    const current = pageCurrent(page)

    return inertia.render('admin/pages/versions', {
      page: PageTransformer.transform(page).useVariant('forList'),
      versions: PageVersionTransformer.transform(rows),
      differs: Object.fromEntries(
        rows.map((version) => [version.id, differsFromNow(pageVersionSnapshot(version), current)])
      ),
      meta,
    })
  }

  async show({ inertia, params, bouncer }: HttpContext) {
    await bouncer.authorize('access', 'pages:read')
    const page = await Page.query().where('id', params.id).whereNull('deleted_at').firstOrFail()
    const version = await PageVersion.query()
      .where('page_id', page.id)
      .where('id', params.versionId)
      .preload('user')
      .firstOrFail()

    return inertia.render('admin/pages/version', {
      page: PageTransformer.transform(page).useVariant('forList'),
      version: PageVersionTransformer.transform(version),
      blockLabels: await blockLabels(),
      diff: versionDiff(pageVersionSnapshot(version), pageCurrent(page)),
    })
  }

  async restore(ctx: HttpContext) {
    const { params, response, bouncer, session, auth } = ctx
    await bouncer.authorize('access', 'pages:write')
    const page = await Page.query().where('id', params.id).whereNull('deleted_at').firstOrFail()
    if (page.status === 'published') await bouncer.authorize('access', 'pages:publish')
    const version = await PageVersion.query()
      .where('page_id', page.id)
      .where('id', params.versionId)
      .firstOrFail()

    page.merge({
      title: version.title,
      blocks: version.blocks,
      seo: version.seo,
      ...(version.frontmatter ? { frontmatter: version.frontmatter } : {}),
    })
    await page.save()
    await snapshot(page, auth.use('web').user)
    await audit(ctx, 'page.restored_version', page, { versionId: version.id })
    await announce('page.updated', page, { origin: ctx })

    session.flash('success', 'Version restored')
    return response.redirect().toRoute('admin.pages.edit', { id: page.id })
  }
}
