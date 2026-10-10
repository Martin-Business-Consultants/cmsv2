import env from '#start/env'
import mail from '@adonisjs/mail/services/main'
import Collection from '#models/collection'
import Entry from '#models/entry'
import CollectionEventMessage from '#mails/collection_event_message'
import { NOTIFICATION_EVENTS, type NotificationEvent } from '#types/content'
import { getSetting, getSettings } from '#services/settings'
import { brandingAssets } from '#services/branding'
import type { Announcement } from '#services/events'

export const DEFAULT_FROM_NAME = 'Notifications'

export const EVENT_VERBS: Record<NotificationEvent, string> = {
  'entry.created': 'created',
  'entry.updated': 'updated',
  'entry.published': 'published',
  'entry.unpublished': 'unpublished',
  'entry.deleted': 'deleted',
}

export type NotificationPayload = {
  collectionId: number
  entryId: number
  event: NotificationEvent
  data: Record<string, unknown>
}

export function isNotificationEvent(event: string): event is NotificationEvent {
  return (NOTIFICATION_EVENTS as readonly string[]).includes(event)
}

export function normalizeNotificationEvents(raw: unknown): NotificationEvent[] {
  const list = Array.isArray(raw) ? raw.map(String) : []
  return NOTIFICATION_EVENTS.filter((event) => list.includes(event))
}

export function notificationEmailList(emails: string | null | undefined) {
  return (emails ?? '')
    .split(/[,\n]/)
    .map((email) => email.trim())
    .filter(Boolean)
}

const EMAIL = /^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/

export function notificationEmailErrors(emails: string | null | undefined) {
  const bad = notificationEmailList(emails).filter((email) => !EMAIL.test(email))
  return bad.length
    ? [
        {
          field: 'notificationEmails',
          message: `Not an email address: ${bad.join(', ')}`,
          rule: 'email',
        },
      ]
    : []
}

export function notifiesOn(collection: Collection, event: string) {
  return (
    Array.isArray(collection.notificationEvents) &&
    collection.notificationEvents.includes(event) &&
    notificationEmailList(collection.notificationEmails).length > 0
  )
}

export async function notificationFor(
  announcement: Announcement
): Promise<NotificationPayload | null> {
  if (announcement.kind !== 'entry' || !isNotificationEvent(announcement.event)) return null
  const entry = announcement.record as Entry
  const collection = entry.$preloaded.collection
    ? (entry.collection as Collection)
    : await Collection.find(entry.collectionId)
  if (!collection || !notifiesOn(collection, announcement.event)) return null
  return {
    collectionId: collection.id,
    entryId: entry.id,
    event: announcement.event,
    data: announcement.data,
  }
}

function cmsUrl(pathOrUrl: string) {
  let path = pathOrUrl
  try {
    const parsed = new URL(pathOrUrl)
    path = `${parsed.pathname}${parsed.search}`
  } catch {}
  return new URL(path, env.get('APP_URL')).toString()
}

async function sender() {
  const site = await getSettings()
  const forms = (await getSetting<{ fromName?: string; fromEmail?: string }>('forms')) ?? {}
  return {
    name: site.emailFromName || forms.fromName || DEFAULT_FROM_NAME,
    address: site.emailFromAddress || forms.fromEmail || env.get('MAIL_FROM_ADDRESS'),
  }
}

export async function sendCollectionNotification(payload: NotificationPayload) {
  const collection = await Collection.find(payload.collectionId)
  if (!collection || !notifiesOn(collection, payload.event)) return
  const entry = await Entry.find(payload.entryId)
  const data = payload.data ?? {}
  const text = (value: unknown) => (typeof value === 'string' && value ? value : null)
  const title = entry?.title || text(data.title) || '(untitled)'
  const verb = EVENT_VERBS[payload.event] ?? payload.event
  const { logoUrl } = await brandingAssets()

  await mail.send(
    new CollectionEventMessage({
      from: await sender(),
      to: notificationEmailList(collection.notificationEmails),
      subject: `[${collection.name}] entry ${verb}: ${title}`,
      collectionName: collection.name,
      verb,
      event: payload.event,
      title,
      slug: entry?.slug ?? text(data.slug) ?? '',
      status: entry?.status ?? text(data.status) ?? '—',
      logoUrl: logoUrl ? cmsUrl(logoUrl) : null,
      entryUrl: entry
        ? cmsUrl(`/admin/collections/${collection.id}/entries/${entry.id}/edit`)
        : null,
    })
  )
}
