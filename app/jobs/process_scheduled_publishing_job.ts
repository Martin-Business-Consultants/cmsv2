import db from '@adonisjs/lucid/services/db'
import logger from '@adonisjs/core/services/logger'
import { DateTime } from 'luxon'
import Page from '#models/page'
import Entry from '#models/entry'
import { BaseJob } from '#services/jobs'
import { audit } from '#services/audit'
import { announce } from '#services/events'

type Step = {
  model: typeof Page | typeof Entry
  kind: 'page' | 'entry'
  column: 'publish_at' | 'unpublish_at'
}

const STEPS: Step[] = [
  { model: Page, kind: 'page', column: 'publish_at' },
  { model: Page, kind: 'page', column: 'unpublish_at' },
  { model: Entry, kind: 'entry', column: 'publish_at' },
  { model: Entry, kind: 'entry', column: 'unpublish_at' },
]

const ORIGIN = { via: 'scheduler' } as const

export default class ProcessScheduledPublishingJob extends BaseJob {
  static options = { maxRetries: 0 }

  async handle() {
    const now = DateTime.utc().toFormat('yyyy-MM-dd HH:mm:ss')
    const errors: unknown[] = []
    for (const step of STEPS) {
      try {
        errors.push(...(await this.#run(step, now)))
      } catch (error) {
        errors.push(error)
      }
    }
    if (errors.length) {
      throw new Error(
        `${errors.length} scheduled change(s) left for the next run: ${errors
          .map((error) => (error instanceof Error ? error.message : String(error)))
          .slice(0, 3)
          .join('; ')}`
      )
    }
  }

  async #run({ model, kind, column }: Step, now: string) {
    const publishing = column === 'publish_at'
    const due = (query: any) => {
      query.whereNull('deleted_at').whereNotNull(column).where(column, '<=', now)
      if (publishing) query.whereNot('status', 'published')
      else query.where('status', 'published')
    }
    const rows: { id: number; status: string }[] = await db
      .from(model.table)
      .where(due)
      .select('id', 'status')
    const errors: unknown[] = []
    for (const row of rows) {
      try {
        const changes = publishing
          ? {
              status: 'published',
              published_at: db.raw('COALESCE(published_at, ?)', [now]),
              publish_at: null,
            }
          : { status: 'archived', unpublish_at: null }
        const affected = await db
          .from(model.table)
          .where('id', row.id)
          .where(due)
          .update({ ...changes, updated_at: now, lock_version: db.raw('lock_version + 1') })
        if (!Number(affected)) continue
        const record = await model.find(row.id)
        if (!record) continue
        const action = publishing ? 'published' : 'unpublished'
        await audit(ORIGIN, `${kind}.${action}`, record, {
          scheduled: true,
          from: row.status,
          to: record.status,
        })
        await announce(`${kind}.${action}`, record, { from: row.status, origin: ORIGIN })
        logger.info({ kind, id: row.id, action }, 'Scheduled change applied')
      } catch (error) {
        logger.error({ err: error, kind, id: row.id, column }, 'Scheduled change failed')
        errors.push(error)
      }
    }
    return errors
  }
}
