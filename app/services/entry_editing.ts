import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import type Collection from '#models/collection'
import Entry from '#models/entry'
import { planRecordMeta } from '#services/record_meta'
import {
  assertValid,
  coerceBlocks,
  coerceData,
  validateBlocks,
  validateData,
  type BlockTypeLookup,
  type FieldError,
} from '#services/fields'
import { isRichTextDoc, richTextIsEmpty, richTextIsRenderable } from '#services/rich_text'
import { blockTypeLookup } from '#services/blocks'
import { assertEntrySlugFree, snapshot } from '#services/entries'
import { audit } from '#services/audit'
import { announce } from '#services/events'
import { normalizeSeo } from '#validators/content'
import { actorOf } from '#services/actor'
import { applyWorkflow, denyPublish, transitionAction } from '#services/publishing'
import type { Block, RichTextDoc, Status } from '#types/content'
import type { TermInput } from '#services/taxonomy'
import type { EditOptions } from '#services/page_editing'

export type EntryValues = {
  title: string
  slug: string
  data: Record<string, unknown>
  body?: Record<string, unknown> | null
  blocks?: Block[]
  seo: Record<string, unknown>
  status?: Status
  publishAt?: DateTime | null
  unpublishAt?: DateTime | null
  locale?: string
  category?: TermInput | null
  tags?: TermInput[]
}

export function entryContent(
  collection: Collection,
  values: Pick<EntryValues, 'data' | 'body' | 'blocks'>,
  lookup: BlockTypeLookup,
  current?: Entry
) {
  const data = coerceData(collection.fields, values.data, lookup)
  const blocks = coerceBlocks(values.blocks ?? current?.blocks ?? [], lookup)
  const rawBody = values.body === undefined ? (current?.body ?? null) : values.body
  const body = isRichTextDoc(rawBody) && !richTextIsEmpty(rawBody) ? rawBody : null
  const errors: FieldError[] = validateData(collection.fields, data, lookup)
  if (collection.enableBlocks) errors.push(...validateBlocks(blocks, lookup))
  else if (values.blocks?.length) {
    errors.push({
      field: 'blocks',
      message: 'Blocks are not enabled for this collection',
      rule: 'enabled',
    })
  }
  if (body && !richTextIsRenderable(body)) {
    errors.push({
      field: 'body',
      message: "Body contains content the editor doesn't support",
      rule: 'richtext',
    })
  }
  assertValid(errors)
  return { data, blocks: collection.enableBlocks ? blocks : (current?.blocks ?? []), body }
}

export async function createEntry(
  ctx: HttpContext,
  collection: Collection,
  values: EntryValues,
  options: EditOptions = {}
) {
  const actor = actorOf(ctx)
  const seo = normalizeSeo(values.seo)
  const content = entryContent(collection, values, await blockTypeLookup())
  const entry = new Entry()
  entry.collectionId = collection.id
  const recordMeta = await planRecordMeta(ctx, 'entry', entry, values, collection)
  await assertEntrySlugFree(collection.id, values.slug, undefined, recordMeta.locale)

  entry.merge({
    collectionId: collection.id,
    title: values.title,
    slug: values.slug,
    status: 'draft',
    data: content.data,
    body: content.body as RichTextDoc | null,
    blocks: content.blocks,
    seo,
  })
  entry.$setRelated('collection', collection)
  const { publishingWrite } = applyWorkflow(entry, values)
  if (options.publishedAt !== undefined) entry.publishedAt = options.publishedAt
  if (publishingWrite && !actor.can('entries:publish')) (options.onPublishDenied ?? denyPublish)()
  await recordMeta.beforeSave()
  await entry.save()
  await recordMeta.afterSave()
  await snapshot(entry, actor.user)
  await audit(ctx, 'entry.created', entry, {
    collection: collection.slug,
    status: entry.status,
    ...options.metadata,
  })
  await announce('entry.created', entry, { origin: ctx })
  return entry
}

export async function updateEntry(
  ctx: HttpContext,
  collection: Collection,
  entry: Entry,
  values: EntryValues,
  options: EditOptions = {}
) {
  const actor = actorOf(ctx)
  const seo = normalizeSeo(values.seo)
  const content = entryContent(collection, values, await blockTypeLookup(), entry)
  const recordMeta = await planRecordMeta(ctx, 'entry', entry, values, collection)
  await assertEntrySlugFree(collection.id, values.slug, entry.id, recordMeta.locale)

  entry.merge({
    title: values.title,
    slug: values.slug,
    data: content.data,
    body: content.body as RichTextDoc | null,
    blocks: content.blocks,
    seo,
  })
  const { from, publishingWrite } = applyWorkflow(entry, values)
  if (options.publishedAt !== undefined) entry.publishedAt = options.publishedAt
  if (publishingWrite && !actor.can('entries:publish')) (options.onPublishDenied ?? denyPublish)()
  await recordMeta.beforeSave()
  await entry.save()
  await recordMeta.afterSave()
  await snapshot(entry, actor.user)
  const { action, metadata } = transitionAction('entry', from, entry.status)
  await audit(ctx, action, entry, { collection: collection.slug, ...metadata, ...options.metadata })
  await announce('entry.updated', entry, { from, origin: ctx })
  return { entry, from }
}

export async function changeEntryStatus(
  ctx: HttpContext,
  collection: Collection,
  entry: Entry,
  to: Status,
  metadata: Record<string, unknown> = {}
) {
  if (entry.status === to) return false
  const { from } = applyWorkflow(entry, { status: to })
  await entry.save()
  const transition = transitionAction('entry', from, to)
  await audit(ctx, transition.action, entry, {
    collection: collection.slug,
    ...metadata,
    ...transition.metadata,
  })
  await announce('entry.updated', entry, { from, origin: ctx })
  return true
}

export async function trashEntry(
  ctx: HttpContext,
  collection: Collection,
  entry: Entry,
  metadata: Record<string, unknown> = {}
) {
  entry.deletedAt = DateTime.now()
  await entry.save()
  await audit(ctx, 'entry.trashed', entry, { collection: collection.slug, ...metadata })
  await announce('entry.trashed', entry, { origin: ctx })
}

export async function purgeEntry(ctx: HttpContext, collection: Collection, entry: Entry) {
  await audit(ctx, 'entry.deleted', entry, { collection: collection.slug })
  await entry.delete()
  await announce('entry.purged', entry, { origin: ctx })
}
