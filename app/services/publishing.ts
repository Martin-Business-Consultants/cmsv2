import { errors } from '@vinejs/vine'
import { DateTime } from 'luxon'
import type { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'
import type { Status } from '#types/content'

type Schedulable = {
  status: Status
  deletedAt: DateTime | null
  publishedAt: DateTime | null
  publishAt: DateTime | null
  unpublishAt: DateTime | null
}

export const PUBLISH_DENIED = 'Changing live content, or publishing, needs the publish permission'

export const STALE_SAVE =
  "Someone else saved this while you were editing, so your changes weren't saved. Copy anything you want to keep, then reload the page to see theirs."

export function sqlNow() {
  return DateTime.utc().toFormat('yyyy-MM-dd HH:mm:ss')
}

export function applyLiveScope(query: ModelQueryBuilderContract<any, any>) {
  const now = sqlNow()
  query
    .whereNull('deleted_at')
    .where((visible) =>
      visible
        .where((published) =>
          published
            .where('status', 'published')
            .where((since) => since.whereNull('published_at').orWhere('published_at', '<=', now))
        )
        .orWhere((due) =>
          due
            .whereNot('status', 'published')
            .whereNotNull('publish_at')
            .where('publish_at', '<=', now)
        )
    )
    .where((until) => until.whereNull('unpublish_at').orWhere('unpublish_at', '>', now))
}

export function recordIsLive(record: Schedulable, now = DateTime.now()) {
  if (record.deletedAt) return false
  if (record.unpublishAt && record.unpublishAt <= now) return false
  if (record.status === 'published') return !record.publishedAt || record.publishedAt <= now
  return !!record.publishAt && record.publishAt <= now
}

export function recordIsScheduled(record: Schedulable, now = DateTime.now()) {
  return (
    (!!record.publishAt && record.publishAt > now && record.status !== 'published') ||
    (!!record.unpublishAt && record.unpublishAt > now && record.status === 'published')
  )
}

export function sameSecond(a: DateTime | null, b: DateTime | null) {
  if (!a || !b) return a === b
  return Math.floor(a.toSeconds()) === Math.floor(b.toSeconds())
}

export type WorkflowInput = {
  status?: Status
  publishAt?: DateTime | null
  unpublishAt?: DateTime | null
  lockVersion?: number
}

export function assertFresh(record: { lockVersion: number }, posted: number | undefined) {
  if (posted === undefined || posted === record.lockVersion) return
  throw new errors.E_VALIDATION_ERROR([
    { field: 'lockVersion', message: STALE_SAVE, rule: 'stale' },
  ])
}

export function denyPublish(): never {
  throw new errors.E_VALIDATION_ERROR([{ field: 'form', message: PUBLISH_DENIED, rule: 'publish' }])
}

export function applyWorkflow(record: Schedulable, input: WorkflowInput) {
  const before = {
    status: record.status,
    publishAt: record.publishAt,
  }
  if (input.status) record.status = input.status
  if (input.publishAt !== undefined) {
    const incoming = input.publishAt ?? null
    if (!sameSecond(record.publishAt, incoming)) record.publishAt = incoming
  }
  if (input.unpublishAt !== undefined) {
    const incoming = input.unpublishAt ?? null
    if (!sameSecond(record.unpublishAt, incoming)) record.unpublishAt = incoming
  }
  const wasLive = before.status === 'published'
  const publishes = record.status === 'published' && before.status !== 'published'
  const schedules = !sameSecond(before.publishAt, record.publishAt) && !!record.publishAt
  if (record.status === 'published') {
    record.publishedAt = record.publishedAt ?? DateTime.now()
    if (publishes) record.publishAt = null
  }
  if (record.publishAt && record.unpublishAt && record.unpublishAt <= record.publishAt) {
    throw new errors.E_VALIDATION_ERROR([
      {
        field: 'unpublishAt',
        message: 'Must be after the scheduled publish time',
        rule: 'after',
      },
    ])
  }
  return { from: before.status, publishingWrite: wasLive || publishes || schedules }
}

export function transitionAction(kind: string, from: Status, to: Status) {
  if (from === to) return { action: `${kind}.updated`, metadata: { status: to } }
  if (to === 'published') return { action: `${kind}.published`, metadata: { from } }
  if (from === 'published') return { action: `${kind}.unpublished`, metadata: { to } }
  return { action: `${kind}.updated`, metadata: { from, to } }
}

export function savedMessage(noun: string, record: Schedulable, from: Status, fallback: string) {
  if (record.status === 'published' && from !== 'published') return `${noun} published`
  if (record.status !== 'published' && recordIsScheduled(record)) return `${noun} scheduled`
  if (record.status === 'archived' && from !== 'archived') return `${noun} archived`
  if (record.status === 'draft' && from === 'published') return `${noun} unpublished`
  return `${noun} ${fallback}`
}
