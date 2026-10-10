import { createHash } from 'node:crypto'
import db from '@adonisjs/lucid/services/db'
import { sqlNow } from '#services/publishing'

const STAMPED_TABLES = [
  { table: 'pages', scheduled: true },
  { table: 'entries', scheduled: true },
  { table: 'globals', scheduled: false },
  { table: 'collections', scheduled: false },
  { table: 'block_types', scheduled: false },
  { table: 'taggings', scheduled: false },
  { table: 'translation_groups', scheduled: false },
  { table: 'settings', scheduled: false },
]

const MAX_ENTRIES = 500

export type CachedAnswer = {
  data: unknown
  meta: Record<string, unknown>
  assetIds: number[]
  tags: string[]
}

let knownVersion: string | null = null
const answers = new Map<string, CachedAnswer>()

async function stamp(table: string, scheduled: boolean) {
  const now = sqlNow()
  const select = [
    'count(*) as total',
    'max(updated_at) as newest',
    'sum(julianday(updated_at)) as summed',
  ]
  if (scheduled) {
    select.push(
      `sum(case when publish_at is not null and publish_at <= '${now}' then 1 else 0 end) as due`,
      `sum(case when unpublish_at is not null and unpublish_at <= '${now}' then 1 else 0 end) as expired`,
      `sum(case when published_at is not null and published_at <= '${now}' then 1 else 0 end) as out`
    )
  }
  const row = await db.from(table).select(db.raw(select.join(', '))).first()
  return [table, row?.total ?? 0, row?.newest ?? null, row?.summed ?? 0, row?.due, row?.expired, row?.out]
}

export async function deliveryVersion() {
  const stamps = await Promise.all(
    STAMPED_TABLES.map(({ table, scheduled }) => stamp(table, scheduled))
  )
  const version = createHash('sha256').update(JSON.stringify(stamps)).digest('hex')
  if (version !== knownVersion) {
    knownVersion = version
    answers.clear()
  }
  return version
}

export async function remember(key: string, build: () => Promise<CachedAnswer>) {
  const found = answers.get(key)
  if (found) return found
  const answer = await build()
  answers.set(key, answer)
  if (answers.size > MAX_ENTRIES) {
    const oldest = answers.keys().next().value
    if (oldest !== undefined) answers.delete(oldest)
  }
  return answer
}

export function forgetDeliveryCache() {
  answers.clear()
  knownVersion = null
}
