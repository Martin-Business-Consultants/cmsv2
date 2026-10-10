import type { HttpContext } from '@adonisjs/core/http'
import Page from '#models/page'
import PageTransformer from '#transformers/page_transformer'
import { pageValidator } from '#validators/page'
import { recordMetaProps } from '#services/record_meta'
import { listLocaleFilter } from '#services/locales'
import { editorProps } from '#services/blocks'
import { trashPage } from '#services/page_trash'
import {
  applySearch,
  applySort,
  countBy,
  countOf,
  listParams,
  paginate,
  statusCounts,
} from '#services/listing'
import { STATUSES } from '#types/content'
import { pageApiPreview } from '#services/api_preview'
import { availablePageTemplate, availablePageTemplates, templateBlocks } from '#services/templates'
import { assertFresh, savedMessage } from '#services/publishing'
import { createPage, updatePage } from '#services/page_editing'

async function parentOptions(except?: Page) {
  const pages = await Page.query().whereNull('deleted_at').orderBy('path')
  return pages
    .filter(
      (page) => !except || (page.id !== except.id && !page.path.startsWith(`${except.path}/`))
    )
    .map((page) => ({ id: page.id, title: page.title, path: page.path }))
}

export default class PagesController {
  async index({ inertia, request, bouncer, auth }: HttpContext) {
    await bouncer.authorize('access', 'pages:read')
    const qs = request.qs()
    const params = listParams(qs, {
      sorts: { title: 'title', path: 'path', status: 'status', updated: 'updated_at' },
      sort: 'path',
    })
    const status = (STATUSES as readonly string[]).includes(qs.status) ? String(qs.status) : ''

    const base = Page.query().whereNull('deleted_at')
    const locales = await listLocaleFilter(qs, () => Page.query().whereNull('deleted_at'))
    if (locales.locale) base.where('locale', locales.locale)
    const query = applySearch(base.clone(), params.search, ['title', 'path'])
    if (status) query.where('status', status)
    applySort(query, params)

    const [counts, trashed, { rows, meta }] = await Promise.all([
      countBy(base, 'status'),
      countOf(Page.query().whereNotNull('deleted_at')),
      paginate(query, params.page),
    ])

    return inertia.render('admin/pages/index', {
      pages: PageTransformer.transform(rows).useVariant('forList'),
      meta,
      counts: { ...statusCounts(counts, [...STATUSES]), trash: trashed },
      templates: auth.use('web').user?.can('pages:write') ? await availablePageTemplates() : [],
      filters: {
        search: params.search,
        status,
        sort: params.sorted ? params.sort : '',
        order: params.order,
        locale: locales.locale,
      },
      locales: { available: locales.locales, defaultLocale: locales.defaultLocale },
    })
  }

  async create({ inertia, bouncer, request }: HttpContext) {
    await bouncer.authorize('access', 'pages:write')
    return inertia.render('admin/pages/create', {
      ...(await editorProps()),
      parents: await parentOptions(),
      parentId: request.qs().parentId ? Number(request.qs().parentId) : null,
      ...(await recordMetaProps('page')),
    })
  }

  async store(ctx: HttpContext) {
    const { request, response, bouncer, session } = ctx
    await bouncer.authorize('access', 'pages:write')
    const template = await availablePageTemplate(request.input('template'))
    if (template) {
      const blank = (key: string) => !String(request.input(key) ?? '').trim()
      request.updateBody({
        ...request.body(),
        title: blank('title') ? template.title : request.input('title'),
        slug: blank('slug') ? template.slug : request.input('slug'),
        blocks: await templateBlocks(template),
      })
    }
    const values = await request.validateUsing(pageValidator)
    const page = await createPage(ctx, values, {
      metadata: template ? { template: template.key } : {},
    })

    session.flash('success', savedMessage('Page', page, 'draft', 'created'))
    return response.redirect().toRoute('admin.pages.edit', { id: page.id })
  }

  async edit({ inertia, params, bouncer }: HttpContext) {
    await bouncer.authorize('access', 'pages:read')
    const page = await Page.query().where('id', params.id).whereNull('deleted_at').firstOrFail()
    const versions = await page.related('versions').query().count('* as total')

    return inertia.render('admin/pages/edit', {
      page: PageTransformer.transform(page),
      ...(await editorProps()),
      parents: await parentOptions(page),
      versionsCount: Number(versions[0].$extras.total),
      apiPreview: inertia.optional(() => pageApiPreview(page)),
      ...(await recordMetaProps('page', page)),
    })
  }

  async update(ctx: HttpContext) {
    const { request, response, params, bouncer, session } = ctx
    await bouncer.authorize('access', 'pages:write')
    const page = await Page.query().where('id', params.id).whereNull('deleted_at').firstOrFail()

    const values = await request.validateUsing(pageValidator)
    assertFresh(page, values.lockVersion)
    const { from } = await updatePage(ctx, page, values)

    session.flash('success', savedMessage('Page', page, from, 'saved'))
    return response.redirect().back()
  }

  async destroy(ctx: HttpContext) {
    const { params, response, bouncer, session } = ctx
    await bouncer.authorize('access', 'pages:delete')
    const page = await Page.query().where('id', params.id).whereNull('deleted_at').firstOrFail()
    const children = await trashPage(ctx, page)

    session.flash(
      'success',
      children
        ? `Page and ${children} ${children === 1 ? 'child page' : 'child pages'} moved to trash`
        : 'Page moved to trash'
    )
    return response.redirect().toRoute('admin.pages.index')
  }
}
