import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import Page from '#models/page'
import { publicationValidator } from '#validators/content'
import { audit } from '#services/audit'
import { announce } from '#services/events'
import { applyWorkflow, savedMessage, transitionAction } from '#services/publishing'

export default class PagePublicationsController {
  async store(ctx: HttpContext) {
    const { params, request, response, bouncer, session } = ctx
    await bouncer.authorize('access', 'pages:publish')
    const page = await Page.query().where('id', params.id).whereNull('deleted_at').firstOrFail()
    const { publishAt } = await request.validateUsing(publicationValidator)

    const later = !!publishAt && publishAt > DateTime.now()
    const { from } = applyWorkflow(
      page,
      later ? { status: 'draft', publishAt } : { status: 'published', publishAt: null }
    )
    await page.save()
    const { action, metadata } = transitionAction('page', from, page.status)
    await audit(ctx, later ? 'page.scheduled' : action, page, {
      path: page.path,
      ...metadata,
      ...(later ? { publishAt: page.publishAt?.toISO() } : {}),
    })
    await announce('page.updated', page, { from, origin: ctx })

    session.flash('success', savedMessage('Page', page, from, 'saved'))
    return response.redirect().back()
  }

  async destroy(ctx: HttpContext) {
    const { params, response, bouncer, session } = ctx
    await bouncer.authorize('access', 'pages:publish')
    const page = await Page.query().where('id', params.id).whereNull('deleted_at').firstOrFail()

    const { from } = applyWorkflow(page, { status: 'draft', publishAt: null, unpublishAt: null })
    await page.save()
    const { action, metadata } = transitionAction('page', from, page.status)
    await audit(ctx, action, page, { path: page.path, ...metadata })
    await announce('page.updated', page, { from, origin: ctx })

    session.flash('success', 'Page unpublished')
    return response.redirect().back()
  }
}
