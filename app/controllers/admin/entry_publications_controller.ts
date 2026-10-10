import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import Collection from '#models/collection'
import { publicationValidator } from '#validators/content'
import { findEntry } from '#services/entries'
import { audit } from '#services/audit'
import { announce } from '#services/events'
import { applyWorkflow, savedMessage, transitionAction } from '#services/publishing'

export default class EntryPublicationsController {
  async store(ctx: HttpContext) {
    const { params, request, response, bouncer, session } = ctx
    await bouncer.authorize('access', 'entries:publish')
    const collection = await Collection.findOrFail(params.collectionId)
    const entry = await findEntry(collection, params.id)
    const { publishAt } = await request.validateUsing(publicationValidator)

    const later = !!publishAt && publishAt > DateTime.now()
    const { from } = applyWorkflow(
      entry,
      later ? { status: 'draft', publishAt } : { status: 'published', publishAt: null }
    )
    await entry.save()
    const { action, metadata } = transitionAction('entry', from, entry.status)
    await audit(ctx, later ? 'entry.scheduled' : action, entry, {
      collection: collection.slug,
      ...metadata,
      ...(later ? { publishAt: entry.publishAt?.toISO() } : {}),
    })
    await announce('entry.updated', entry, { from, origin: ctx })

    session.flash('success', savedMessage(collection.singularName, entry, from, 'saved'))
    return response.redirect().back()
  }

  async destroy(ctx: HttpContext) {
    const { params, response, bouncer, session } = ctx
    await bouncer.authorize('access', 'entries:publish')
    const collection = await Collection.findOrFail(params.collectionId)
    const entry = await findEntry(collection, params.id)

    const { from } = applyWorkflow(entry, { status: 'draft', publishAt: null, unpublishAt: null })
    await entry.save()
    const { action, metadata } = transitionAction('entry', from, entry.status)
    await audit(ctx, action, entry, { collection: collection.slug, ...metadata })
    await announce('entry.updated', entry, { from, origin: ctx })

    session.flash('success', `${collection.singularName} unpublished`)
    return response.redirect().back()
  }
}
