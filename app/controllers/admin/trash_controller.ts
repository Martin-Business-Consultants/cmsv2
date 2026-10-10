import type { HttpContext } from '@adonisjs/core/http'
import Page from '#models/page'
import Entry from '#models/entry'
import Global from '#models/global'
import { audit } from '#services/audit'
import { announce } from '#services/events'
import { plugins } from '#services/plugins'
import { likePattern, listParams, paginateArray } from '#services/listing'
import { trashBulkValidator } from '#validators/bulk'
import AuditLog from '#models/audit_log'
import {
  liveChildren,
  purgePageTree,
  restorePageTree,
  trashedChildCount,
  trashedWith,
} from '#services/page_trash'

type TrashItem = {
  key: string
  kind: string
  kindLabel: string
  id: number
  title: string
  detail: string | null
  collection: string | null
  status: string | null
  deletedAt: string
}

type Trashed =
  | { kind: 'page'; record: Page }
  | { kind: 'entry'; record: Entry }
  | { kind: 'global'; record: Global }
  | { kind: 'plugin'; key: string; label: string; id: number; title: string }

const CORE_KINDS = [
  { kind: 'page', label: 'Pages' },
  { kind: 'entry', label: 'Entries' },
  { kind: 'global', label: 'Globals' },
]

function pluginTrashables() {
  return plugins.enabled(plugins.trashables)
}

async function trashItems(search: string): Promise<TrashItem[]> {
  const pattern = search ? likePattern(search) : null
  const pagesQuery = Page.query().whereNotNull('deleted_at')
  const entriesQuery = Entry.query().whereNotNull('deleted_at').preload('collection')
  if (pattern) {
    pagesQuery.where((q) =>
      q
        .whereRaw(`title LIKE ? ESCAPE '\\'`, [pattern])
        .orWhereRaw(`path LIKE ? ESCAPE '\\'`, [pattern])
    )
    entriesQuery.where((q) =>
      q
        .whereRaw(`title LIKE ? ESCAPE '\\'`, [pattern])
        .orWhereRaw(`slug LIKE ? ESCAPE '\\'`, [pattern])
    )
  }
  const globalsQuery = Global.query().whereNotNull('deleted_at')
  if (pattern) {
    globalsQuery.where((q) =>
      q
        .whereRaw(`name LIKE ? ESCAPE '\\'`, [pattern])
        .orWhereRaw(`slug LIKE ? ESCAPE '\\'`, [pattern])
    )
  }
  const [pages, entries, globals, extra] = await Promise.all([
    pagesQuery,
    entriesQuery,
    globalsQuery,
    Promise.all(
      pluginTrashables().map(async (definition) => {
        const listed = await definition.list()
        return listed
          .filter((item) => item.deletedAt)
          .filter(
            (item) =>
              !search ||
              `${item.title} ${item.detail ?? ''}`.toLowerCase().includes(search.toLowerCase())
          )
          .map((item) => ({
            key: `${definition.kind}:${item.id}`,
            kind: definition.kind,
            kindLabel: definition.label,
            id: item.id,
            title: item.title,
            detail: item.detail ?? null,
            collection: null,
            status: null,
            deletedAt: item.deletedAt!,
          }))
      })
    ),
  ])

  return [
    ...pages.map((page) => ({
      key: `page:${page.id}`,
      kind: 'page',
      kindLabel: 'Page',
      id: page.id,
      title: page.title,
      detail: page.publicPath,
      collection: null,
      status: page.status,
      deletedAt: page.deletedAt!.toISO()!,
    })),
    ...entries.map((entry) => ({
      key: `entry:${entry.id}`,
      kind: 'entry',
      kindLabel: entry.collection?.singularName ?? 'Entry',
      id: entry.id,
      title: entry.title,
      detail: entry.slug,
      collection: entry.collection?.name ?? null,
      status: entry.status,
      deletedAt: entry.deletedAt!.toISO()!,
    })),
    ...globals.map((global) => ({
      key: `global:${global.id}`,
      kind: 'global',
      kindLabel: 'Global',
      id: global.id,
      title: global.name,
      detail: `globals/${global.slug}`,
      collection: null,
      status: null,
      deletedAt: global.deletedAt!.toISO()!,
    })),
    ...extra.flat(),
  ].sort((a, b) => b.deletedAt.localeCompare(a.deletedAt))
}

async function findTrashed(kind: string, id: number | string): Promise<Trashed | null> {
  if (kind === 'page') {
    const record = await Page.query().where('id', id).whereNotNull('deleted_at').first()
    return record ? { kind, record } : null
  }
  if (kind === 'entry') {
    const record = await Entry.query()
      .where('id', id)
      .whereNotNull('deleted_at')
      .preload('collection')
      .first()
    return record ? { kind, record } : null
  }
  if (kind === 'global') {
    const record = await Global.query().where('id', id).whereNotNull('deleted_at').first()
    return record ? { kind, record } : null
  }
  const definition = pluginTrashables().find((item) => item.kind === kind)
  if (!definition) return null
  const listed = await definition.list()
  const item = listed.find((row) => row.id === Number(id) && row.deletedAt)
  return item
    ? { kind: 'plugin', key: kind, label: definition.label, id: item.id, title: item.title }
    : null
}

function nameOf(item: Trashed) {
  if (item.kind === 'page') return 'Page'
  if (item.kind === 'entry') return item.record.collection?.singularName ?? 'Entry'
  if (item.kind === 'global') return 'Global'
  return item.label
}

function titleOf(item: Trashed) {
  if (item.kind === 'global') return item.record.name
  return item.kind === 'plugin' ? item.title : item.record.title
}

async function restoreBlocker(item: Trashed) {
  if (item.kind === 'page') {
    const page = item.record
    const taken = await Page.query()
      .where('path', page.path)
      .whereNull('deleted_at')
      .whereNot('id', page.id)
      .first()
    if (taken)
      return `Another page ("${taken.title}") now lives at /${page.path}. Move or rename it first.`
    if (page.parentId) {
      const parent = await Page.find(page.parentId)
      if (parent?.deletedAt)
        return `Its parent page "${parent.title}" is in the trash. Restore that first.`
    }
    return null
  }
  if (item.kind === 'entry') {
    const entry = item.record
    const taken = await Entry.query()
      .where('collection_id', entry.collectionId)
      .where('slug', entry.slug)
      .whereNull('deleted_at')
      .whereNot('id', entry.id)
      .first()
    if (taken)
      return `Another entry ("${taken.title}") now uses the slug "${entry.slug}". Change it first.`
  }
  return null
}

async function purgeBlocker(item: Trashed) {
  if (item.kind !== 'page') return null
  const child = await liveChildren(item.record)
  return child ? `"${item.record.title}" still has child pages. Move or delete them first.` : null
}

async function restore(ctx: HttpContext, item: Trashed) {
  if (item.kind === 'plugin') {
    await plugins.trashables.find((definition) => definition.kind === item.key)!.restore(item.id)
    await audit(ctx, 'trash.restored', null, { kind: item.key, id: item.id, title: item.title })
    return false
  }
  if (item.kind === 'global') {
    item.record.deletedAt = null
    await item.record.save()
    await audit(ctx, 'global.restored', item.record, { slug: item.record.slug })
    await announce('global.restored', item.record, { origin: ctx })
    return false
  }
  const capability = item.kind === 'page' ? 'pages:publish' : 'entries:publish'
  const asDraft = item.record.status === 'published' && !ctx.auth.use('web').user?.can(capability)
  if (item.kind === 'page') {
    await restorePageTree(ctx, item.record, { asDraft: !ctx.auth.use('web').user?.can(capability) })
    return asDraft
  }
  item.record.deletedAt = null
  if (asDraft) item.record.status = 'draft'
  await item.record.save()
  await audit(ctx, `${item.kind}.restored`, item.record, asDraft ? { asDraft } : {})
  await announce(`${item.kind}.restored`, item.record, { origin: ctx })
  return asDraft
}

async function purge(ctx: HttpContext, item: Trashed) {
  if (item.kind === 'plugin') {
    await audit(ctx, 'trash.purged', null, { kind: item.key, id: item.id, title: item.title })
    await plugins.trashables.find((definition) => definition.kind === item.key)!.purge(item.id)
    return
  }
  if (item.kind === 'page') {
    await purgePageTree(ctx, item.record)
    return
  }
  await audit(ctx, `${item.kind}.deleted`, item.record)
  await item.record.delete()
  await announce(`${item.kind}.purged`, item.record, { origin: ctx })
}

function parseKey(key: string) {
  const [kind, id] = key.split(':')
  return { kind, id: Number(id) }
}

async function deletionOf(item: Trashed) {
  if (item.kind === 'plugin') return null
  return AuditLog.query()
    .where('subject_type', item.record.constructor.name)
    .where('subject_id', item.record.id)
    .whereIn('action', [`${item.kind}.trashed`, `${item.kind}.deleted`])
    .orderBy('id', 'desc')
    .first()
}

async function factsOf(item: Trashed): Promise<[string, string][]> {
  if (item.kind === 'page') {
    const facts: [string, string][] = [
      ['Status', item.record.status],
      ['Path', item.record.publicPath],
    ]
    const trashedTogether = await trashedWith(item.record)
    const withIt = trashedTogether.length
    if (withIt) facts.push(['Child pages', `${withIt} trashed with it, restored with it`])
    const other = (await trashedChildCount(item.record)) - withIt
    if (other > 0) facts.push(['Other trashed children', String(other)])
    return facts
  }
  if (item.kind === 'entry') {
    return [
      ['Status', item.record.status],
      ['Collection', item.record.collection?.name ?? '—'],
      ['Slug', item.record.slug],
    ]
  }
  if (item.kind === 'global') return [['Slug', item.record.slug]]
  return []
}

export default class TrashController {
  async show(ctx: HttpContext) {
    const { params, response, bouncer, auth } = ctx
    await bouncer.authorize('access', 'trash:read')
    const item = await findTrashed(params.type, params.id)
    if (!item) return response.notFound({ error: 'Not in the trash' })
    const deletion = await deletionOf(item)
    const user = auth.use('web').user!
    const capability =
      item.kind === 'page' ? 'pages:publish' : item.kind === 'entry' ? 'entries:publish' : null
    const status = item.kind === 'page' || item.kind === 'entry' ? item.record.status : null
    return response.json({
      kind: item.kind === 'plugin' ? item.key : item.kind,
      kindLabel: nameOf(item),
      id: item.kind === 'plugin' ? item.id : item.record.id,
      title: titleOf(item),
      facts: await factsOf(item),
      deletedAt: item.kind === 'plugin' ? null : (item.record.deletedAt?.toISO() ?? null),
      deletedBy: deletion?.actorLabel || null,
      restoresAsDraft: Boolean(capability && status === 'published' && !user.can(capability)),
      restoreBlocker: await restoreBlocker(item),
    })
  }

  async index({ inertia, request, bouncer }: HttpContext) {
    await bouncer.authorize('access', 'trash:read')
    const qs = request.qs()
    const params = listParams(qs)
    const kinds = [
      ...CORE_KINDS,
      ...pluginTrashables().map((definition) => ({
        kind: definition.kind,
        label: definition.label,
      })),
    ]
    const kind = kinds.some((option) => option.kind === qs.kind) ? String(qs.kind) : ''

    const all = await trashItems(params.search)
    const counts: Record<string, number> = { all: all.length }
    for (const option of kinds) {
      counts[option.kind] = all.filter((item) => item.kind === option.kind).length
    }
    const { rows, meta } = paginateArray(
      kind ? all.filter((item) => item.kind === kind) : all,
      params.page
    )

    return inertia.render('admin/trash', {
      items: rows,
      kinds,
      counts,
      meta,
      filters: { kind, search: params.search },
    })
  }

  async restore(ctx: HttpContext) {
    const { params, response, bouncer, session } = ctx
    await bouncer.authorize('access', 'trash:write')
    const item = await findTrashed(params.type, params.id)
    if (!item) return response.notFound()

    const blocker = await restoreBlocker(item)
    if (blocker) {
      session.flash('error', blocker)
      return response.redirect().back()
    }

    const asDraft = await restore(ctx, item)
    session.flash(
      'success',
      asDraft ? `Restored as a draft: ${titleOf(item)}` : `${nameOf(item)} restored`
    )
    return response.redirect().back()
  }

  async destroy(ctx: HttpContext) {
    const { params, response, bouncer, session } = ctx
    await bouncer.authorize('access', 'trash:write')
    const item = await findTrashed(params.type, params.id)
    if (!item) return response.notFound()

    const blocker = await purgeBlocker(item)
    if (blocker) {
      session.flash('error', blocker)
      return response.redirect().back()
    }

    await purge(ctx, item)
    session.flash('success', `${nameOf(item)} deleted permanently`)
    return response.redirect().back()
  }

  async bulk(ctx: HttpContext) {
    const { request, response, bouncer, session } = ctx
    await bouncer.authorize('access', 'trash:write')
    const { action, ids } = await request.validateUsing(trashBulkValidator)
    if (action !== 'restore' && action !== 'delete') {
      session.flash('error', 'Choose a bulk action')
      return response.redirect().back()
    }

    let done = 0
    const problems: string[] = []
    for (const key of ids) {
      const { kind, id } = parseKey(key)
      const item = await findTrashed(kind, id)
      if (!item) continue
      const blocker = action === 'restore' ? await restoreBlocker(item) : await purgeBlocker(item)
      if (blocker) {
        problems.push(blocker)
        continue
      }
      if (action === 'restore') await restore(ctx, item)
      else await purge(ctx, item)
      done++
    }

    const verb = action === 'restore' ? 'restored' : 'deleted permanently'
    if (done) session.flash('success', `${done} ${done === 1 ? 'item' : 'items'} ${verb}`)
    if (problems.length) {
      session.flash(
        'error',
        `${problems.length} skipped. ${problems[0]}${problems.length > 1 ? ' …' : ''}`
      )
    }
    return response.redirect().back()
  }
}
