import type { HttpContext } from '@adonisjs/core/http'
import AuditLog from '#models/audit_log'
import User from '#models/user'
import AuditLogTransformer from '#transformers/audit_log_transformer'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import { applySearch, applySort, listParams, paginate } from '#services/listing'

function idsOf(logs: AuditLog[], type: string) {
  return [
    ...new Set(
      logs.filter((log) => log.subjectType === type && log.subjectId).map((log) => log.subjectId!)
    ),
  ]
}

async function linksFor(logs: AuditLog[]) {
  const links: Record<string, string> = {}
  const ids = (table: string, type: string, trashable = false) => {
    const query = db.from(table).whereIn('id', idsOf(logs, type))
    if (trashable) query.whereNull('deleted_at')
    return query.select(table === 'entries' ? ['id', 'collection_id'] : ['id'])
  }
  const [pages, entryRows, users, globals, collections, blockTypes, roles] = await Promise.all([
    ids('pages', 'Page', true),
    ids('entries', 'Entry', true),
    ids('users', 'User'),
    ids('globals', 'Global', true),
    ids('collections', 'Collection'),
    ids('block_types', 'BlockType'),
    ids('roles', 'Role'),
  ])
  const entries = entryRows.map((row) => ({ id: row.id, collectionId: row.collection_id }))

  const hrefs = new Map<string, string>([
    ...pages.map((page) => [`Page:${page.id}`, `/admin/pages/${page.id}/edit`] as const),
    ...entries.map(
      (entry) =>
        [
          `Entry:${entry.id}`,
          `/admin/collections/${entry.collectionId}/entries/${entry.id}/edit`,
        ] as const
    ),
    ...users.map((user) => [`User:${user.id}`, `/admin/users/${user.id}/edit`] as const),
    ...globals.map(
      (global) => [`Global:${global.id}`, `/admin/globals/${global.id}/edit`] as const
    ),
    ...collections.map(
      (collection) =>
        [`Collection:${collection.id}`, `/admin/collections/${collection.id}/edit`] as const
    ),
    ...blockTypes.map(
      (type) => [`BlockType:${type.id}`, `/admin/block-types/${type.id}/edit`] as const
    ),
    ...roles.map((role) => [`Role:${role.id}`, `/admin/roles/${role.id}/edit`] as const),
  ])
  for (const log of logs) {
    const href = hrefs.get(`${log.subjectType}:${log.subjectId}`)
    if (href) links[log.id] = href
  }
  return links
}

function isoDate(value: unknown) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return ''
  return DateTime.fromISO(value).isValid ? value : ''
}

export default class AuditLogsController {
  async index({ inertia, request, bouncer }: HttpContext) {
    await bouncer.authorize('access', 'audit_log:read')
    const qs = request.qs()
    const list = listParams(qs, {
      sorts: { when: 'created_at', action: 'action', actor: 'actor_label' },
      sort: 'when',
      order: 'desc',
    })
    const actionRows = await db.from('audit_logs').distinct('action').orderBy('action')
    const known: string[] = actionRows.map((row) => String(row.action))
    const groups = [...new Set(known.map((action) => action.split('.')[0]))]
    const action =
      typeof qs.action === 'string' &&
      (known.includes(qs.action) ||
        (qs.action.endsWith('.*') && groups.includes(qs.action.slice(0, -2))))
        ? qs.action
        : ''
    const actor =
      qs.actor === 'system' || /^\d+$/.test(String(qs.actor ?? '')) ? String(qs.actor) : ''
    const from = isoDate(qs.from)
    const to = isoDate(qs.to)

    const query = applySearch(AuditLog.query(), list.search, [
      'action',
      'actor_label',
      'subject_label',
      'subject_type',
    ])
    if (action.endsWith('.*')) query.whereLike('action', `${action.slice(0, -2)}.%`)
    else if (action) query.where('action', action)
    if (actor === 'system') query.whereNull('user_id')
    else if (actor) query.where('user_id', Number(actor))
    if (from) query.where('created_at', '>=', `${from} 00:00:00`)
    if (to) {
      query.where('created_at', '<', DateTime.fromISO(to).plus({ days: 1 }).toFormat('yyyy-MM-dd'))
    }
    applySort(query, list)
    const [{ rows, meta }, users] = await Promise.all([
      paginate(query, list.page),
      User.query().orderBy('full_name').orderBy('email'),
    ])

    return inertia.render('admin/audit_log', {
      logs: AuditLogTransformer.transform(rows),
      links: await linksFor(rows),
      actors: users.map((user) => ({ id: user.id, name: user.displayName })),
      actions: known,
      meta,
      filters: {
        search: list.search,
        action,
        actor,
        from,
        to,
        sort: list.sorted ? list.sort : '',
        order: list.order,
      },
    })
  }
}
