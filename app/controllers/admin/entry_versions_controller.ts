import type { HttpContext } from '@adonisjs/core/http'
import Collection from '#models/collection'
import EntryVersion from '#models/entry_version'
import EntryTransformer from '#transformers/entry_transformer'
import EntryVersionTransformer from '#transformers/entry_version_transformer'
import CollectionTransformer from '#transformers/collection_transformer'
import { findEntry, snapshot } from '#services/entries'
import { audit } from '#services/audit'
import { announce } from '#services/events'
import { listParams, paginate } from '#services/listing'
import {
  blockLabels,
  differsFromNow,
  entryCurrent,
  entryVersionSnapshot,
  versionDiff,
} from '#services/versions'

export default class EntryVersionsController {
  async index({ inertia, params, request, bouncer }: HttpContext) {
    await bouncer.authorize('access', 'entries:read')
    const collection = await Collection.findOrFail(params.collectionId)
    const entry = await findEntry(collection, params.id)
    const { rows, meta } = await paginate(
      EntryVersion.query().where('entry_id', entry.id).preload('user').orderBy('id', 'desc'),
      listParams(request.qs()).page
    )
    const current = entryCurrent(entry)

    return inertia.render('admin/entries/versions', {
      collection: CollectionTransformer.transform(collection),
      entry: EntryTransformer.transform(entry).useVariant('forList'),
      versions: EntryVersionTransformer.transform(rows),
      differs: Object.fromEntries(
        rows.map((version) => [version.id, differsFromNow(entryVersionSnapshot(version), current)])
      ),
      meta,
    })
  }

  async show({ inertia, params, bouncer }: HttpContext) {
    await bouncer.authorize('access', 'entries:read')
    const collection = await Collection.findOrFail(params.collectionId)
    const entry = await findEntry(collection, params.id)
    const version = await EntryVersion.query()
      .where('entry_id', entry.id)
      .where('id', params.versionId)
      .preload('user')
      .firstOrFail()

    return inertia.render('admin/entries/version', {
      collection: CollectionTransformer.transform(collection),
      entry: EntryTransformer.transform(entry).useVariant('forList'),
      version: EntryVersionTransformer.transform(version),
      blockLabels: await blockLabels(),
      diff: versionDiff(entryVersionSnapshot(version), entryCurrent(entry)),
    })
  }

  async restore(ctx: HttpContext) {
    const { params, response, bouncer, session, auth } = ctx
    await bouncer.authorize('access', 'entries:write')
    const collection = await Collection.findOrFail(params.collectionId)
    const entry = await findEntry(collection, params.id)
    if (entry.status === 'published') await bouncer.authorize('access', 'entries:publish')
    const version = await EntryVersion.query()
      .where('entry_id', entry.id)
      .where('id', params.versionId)
      .firstOrFail()

    entry.merge({
      title: version.title,
      data: version.data,
      seo: version.seo,
      ...(version.blocks ? { blocks: version.blocks, body: version.body } : {}),
    })
    await entry.save()
    await snapshot(entry, auth.use('web').user)
    await audit(ctx, 'entry.restored_version', entry, {
      collection: collection.slug,
      versionId: version.id,
    })
    await announce('entry.updated', entry, { origin: ctx })

    session.flash('success', 'Version restored')
    return response.redirect().toRoute('admin.entries.edit', {
      collectionId: collection.id,
      id: entry.id,
    })
  }
}
