import { DateTime } from 'luxon'
import logger from '@adonisjs/core/services/logger'
import env from '#start/env'
import Page from '#models/page'
import Entry from '#models/entry'
import Global from '#models/global'
import { audit } from '#services/audit'
import { announce } from '#services/events'
import { plugins } from '#services/plugins'

export const DEFAULT_TRASH_DAYS = 30

const ORIGIN = { via: 'scheduler' as const }

export function trashRetentionDays() {
  return Math.max(0, Math.floor(env.get('CMS_TRASH_DAYS') ?? DEFAULT_TRASH_DAYS))
}

function sqlTime(time: DateTime) {
  return time.toUTC().toFormat('yyyy-MM-dd HH:mm:ss')
}

async function purgePages(cutoff: DateTime) {
  let purged = 0
  for (let pass = 0; pass < 50; pass++) {
    const pages = await Page.query()
      .whereNotNull('deleted_at')
      .where('deleted_at', '<', sqlTime(cutoff))
      .whereNotExists((query) =>
        query.from('pages as children').whereColumn('children.parent_id', 'pages.id')
      )
    if (!pages.length) break
    for (const page of pages) {
      await audit(ORIGIN, 'page.deleted', page, { retention: true })
      await page.delete()
      await announce('page.purged', page, { origin: ORIGIN })
      purged++
    }
  }
  return purged
}

async function purgeRecords(
  model: typeof Entry | typeof Global,
  kind: 'entry' | 'global',
  cutoff: DateTime
) {
  const records = await model
    .query()
    .whereNotNull('deleted_at')
    .where('deleted_at', '<', sqlTime(cutoff))
  for (const record of records) {
    await audit(ORIGIN, `${kind}.deleted`, record, { retention: true })
    await record.delete()
    await announce(`${kind}.purged`, record, { origin: ORIGIN })
  }
  return records.length
}

async function purgePluginKinds(cutoff: DateTime) {
  let purged = 0
  for (const definition of plugins.enabled(plugins.trashables)) {
    try {
      for (const item of await definition.list()) {
        if (!item.deletedAt) continue
        const deletedAt = DateTime.fromISO(item.deletedAt)
        if (!deletedAt.isValid || deletedAt >= cutoff) continue
        await audit(ORIGIN, 'trash.purged', null, {
          kind: definition.kind,
          id: item.id,
          title: item.title,
          retention: true,
        })
        await definition.purge(item.id)
        purged++
      }
    } catch (error) {
      logger.error({ err: error, kind: definition.kind }, 'Could not purge expired plugin trash')
    }
  }
  return purged
}

export async function purgeExpiredTrash(now = DateTime.now()) {
  const days = trashRetentionDays()
  if (!days) return { days, purged: 0 }
  const cutoff = now.minus({ days })
  const purged =
    (await purgeRecords(Entry, 'entry', cutoff)) +
    (await purgePages(cutoff)) +
    (await purgeRecords(Global, 'global', cutoff)) +
    (await purgePluginKinds(cutoff))
  if (purged) logger.info({ purged, days }, 'Purged expired trash')
  return { days, purged }
}
