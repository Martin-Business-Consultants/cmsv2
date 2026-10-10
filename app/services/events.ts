import emitter from '@adonisjs/core/services/emitter'
import logger from '@adonisjs/core/services/logger'
import env from '#start/env'
import Page from '#models/page'
import Entry from '#models/entry'
import Global from '#models/global'
import { plugins } from '#services/plugins'
import { originOf, type Origin, type OriginSource } from '#services/audit'

export const CONTENT_EVENTS = [
  'page.created',
  'page.published',
  'page.updated',
  'page.unpublished',
  'page.deleted',
  'entry.created',
  'entry.published',
  'entry.updated',
  'entry.unpublished',
  'entry.deleted',
  'global.updated',
] as const

export type ContentEvent = (typeof CONTENT_EVENTS)[number]

export const WEBHOOK_EVENTS = CONTENT_EVENTS.filter(
  (event) => !event.endsWith('.created')
) as Exclude<ContentEvent, `${string}.created`>[]

export type ContentKind = 'page' | 'entry' | 'global'

export type ContentOperation =
  | 'created'
  | 'updated'
  | 'published'
  | 'unpublished'
  | 'trashed'
  | 'restored'
  | 'deleted'
  | 'purged'

export type AnnounceableRecord = Page | Entry | Global

export type Announcement = {
  event: ContentEvent
  kind: ContentKind
  id: number
  data: Record<string, unknown>
  record: AnnounceableRecord
  origin: Origin
  at: string
}

export type AnnounceOptions = {
  from?: string | null
  origin?: OriginSource
}

type ContentEventsList = { [Event in ContentEvent]: Announcement }

declare module '@adonisjs/core/types' {
  interface EventsList extends ContentEventsList {
    'cms:announced': Announcement
  }
}

const KINDS: Record<string, ContentKind> = {
  [Page.table]: 'page',
  [Entry.table]: 'entry',
  [Global.table]: 'global',
}

function kindOf(record: AnnounceableRecord): ContentKind {
  const kind = KINDS[(record.constructor as { table?: string }).table ?? '']
  if (!kind) throw new Error(`Cannot announce a ${record.constructor.name}`)
  return kind
}

function isKind<Kind extends ContentKind>(
  record: AnnounceableRecord,
  kind: Kind
): record is { page: Page; entry: Entry; global: Global }[Kind] {
  return kindOf(record) === kind
}

function transitions(
  kind: ContentKind,
  operation: ContentOperation,
  status: string | null,
  from: string | null | undefined
): ContentEvent[] {
  if (kind === 'global') {
    return operation === 'created' || operation === 'updated' || operation === 'restored'
      ? ['global.updated']
      : []
  }
  const live = status === 'published'
  const event = (name: 'created' | 'published' | 'updated' | 'unpublished' | 'deleted') =>
    `${kind}.${name}` as ContentEvent
  switch (operation) {
    case 'created':
      return live ? [event('created'), event('published')] : [event('created')]
    case 'published':
      if (!live) return []
      return from === 'published' ? [event('updated')] : [event('published')]
    case 'unpublished':
      return live || (from !== undefined && from !== 'published') ? [] : [event('unpublished')]
    case 'updated': {
      const was = from === undefined ? status : from
      if (was !== 'published' && live) return [event('published')]
      if (was === 'published' && !live) return [event('unpublished')]
      if (was === 'published' && live) return [event('updated')]
      return []
    }
    case 'trashed':
      return live ? [event('unpublished')] : [event('deleted')]
    case 'restored':
      return live ? [event('published')] : []
    case 'deleted':
    case 'purged':
      return [event('deleted')]
  }
}

function absoluteUrl(path: string | null) {
  if (!path) return null
  return new URL(path, env.get('APP_URL')).toString()
}

export async function payloadFor(record: AnnounceableRecord): Promise<Record<string, unknown>> {
  if (isKind(record, 'global')) {
    return {
      id: record.id,
      slug: record.slug,
      name: record.name,
      updated_at: record.updatedAt?.toISO() ?? null,
    }
  }
  if (isKind(record, 'entry')) {
    if (!record.$preloaded.collection) await record.load('collection')
    return {
      id: record.id,
      slug: record.slug,
      collection_slug: record.collection?.slug ?? null,
      url: record.seo?.canonicalUrl || absoluteUrl(record.publicPath),
      title: record.title,
      status: record.status,
      published_at: record.publishedAt?.toISO() ?? null,
      updated_at: record.updatedAt?.toISO() ?? null,
    }
  }
  return {
    id: record.id,
    slug: record.slug,
    path: record.publicPath,
    url: record.seo?.canonicalUrl || absoluteUrl(record.publicPath),
    title: record.title,
    status: record.status,
    published_at: record.publishedAt?.toISO() ?? null,
    updated_at: record.updatedAt?.toISO() ?? null,
  }
}

export async function dispatchEvent(announcement: Announcement) {
  try {
    await plugins.emit({
      action: announcement.event,
      subject: {
        type: announcement.record.constructor.name,
        id: announcement.id,
        label: String(announcement.data.title ?? announcement.data.name ?? `#${announcement.id}`),
        record: announcement.record,
      },
      metadata: { data: announcement.data, via: announcement.origin.via },
      userId: announcement.origin.userId,
    })
  } catch (error) {
    logger.error({ err: error, event: announcement.event }, 'Plugin listeners failed')
  }
  for (const name of [announcement.event, 'cms:announced'] as const) {
    try {
      await emitter.emit(name, announcement)
    } catch (error) {
      logger.error({ err: error, event: name }, 'Event listener failed')
    }
  }
}

export async function announce(
  action: `${ContentKind}.${ContentOperation}`,
  record: AnnounceableRecord,
  options: AnnounceOptions = {}
) {
  try {
    const kind = kindOf(record)
    const operation = action.slice(action.indexOf('.') + 1) as ContentOperation
    const status = isKind(record, 'global') ? null : record.status
    const events = transitions(kind, operation, status, options.from)
    if (!events.length) return []
    const origin = originOf(options.origin)
    const data = await payloadFor(record)
    const at = new Date().toISOString()
    for (const event of events) {
      await dispatchEvent({ event, kind, id: record.id, data, record, origin, at })
    }
    return events
  } catch (error) {
    logger.error({ err: error, action }, 'Could not announce content event')
    return []
  }
}
