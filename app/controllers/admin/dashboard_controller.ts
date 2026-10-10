import type { HttpContext } from '@adonisjs/core/http'
import { type DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import Page from '#models/page'
import Entry from '#models/entry'
import { plugins } from '#services/plugins'
import AuditLog from '#models/audit_log'
import AuditLogTransformer from '#transformers/audit_log_transformer'

async function statusCounts(table: 'pages' | 'entries') {
  const rows: { status: string; total: number | string }[] = await db
    .from(table)
    .whereNull('deleted_at')
    .select('status')
    .count('* as total')
    .groupBy('status')
  const counts = { total: 0, published: 0, draft: 0 }
  for (const row of rows) {
    const total = Number(row.total)
    counts.total += total
    if (row.status === 'published') counts.published += total
    else counts.draft += total
  }
  return counts
}

function iso(date: DateTime | null) {
  return date?.toISO() ?? null
}

async function recentPages() {
  const pages = await Page.query().whereNull('deleted_at').orderBy('updated_at', 'desc').limit(6)
  return pages.map((page) => ({
    id: page.id,
    title: page.title,
    path: page.path,
    status: page.status,
    updatedAt: iso(page.updatedAt ?? page.createdAt),
  }))
}

async function recentEntries() {
  const entries = await Entry.query()
    .whereNull('deleted_at')
    .preload('collection')
    .orderBy('updated_at', 'desc')
    .limit(6)
  return entries.map((entry) => ({
    id: entry.id,
    title: entry.title,
    collectionId: entry.collectionId,
    collectionName: entry.collection.name,
    status: entry.status,
    updatedAt: iso(entry.updatedAt ?? entry.createdAt),
  }))
}

export default class DashboardController {
  async show(ctx: HttpContext) {
    const { inertia, auth } = ctx
    const user = auth.use('web').user!

    const pages = user.can('pages:read')
      ? {
          counts: await statusCounts('pages'),
          recent: await recentPages(),
        }
      : null

    const entries = user.can('entries:read')
      ? {
          counts: await statusCounts('entries'),
          recent: await recentEntries(),
        }
      : null

    const widgets = []
    for (const widget of plugins.enabled(plugins.widgets)) {
      if (widget.capability && !user.can(widget.capability)) continue
      widgets.push({
        id: `${widget.plugin}/${widget.component}`,
        title: widget.title,
        props: JSON.parse(JSON.stringify((await widget.props?.(ctx)) ?? {})),
      })
    }

    const activity = user.can('audit_log:read')
      ? AuditLogTransformer.transform(
          await AuditLog.query().orderBy('created_at', 'desc').orderBy('id', 'desc').limit(8)
        )
      : null

    return inertia.render('admin/dashboard', { pages, entries, widgets, activity })
  }
}
