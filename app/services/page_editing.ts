import type { HttpContext } from '@adonisjs/core/http'
import type { DateTime } from 'luxon'
import Page from '#models/page'
import { planRecordMeta } from '#services/record_meta'
import { assertValid, coerceBlocks, coerceData, validateBlocks, validateData } from '#services/fields'
import { blockTypeLookup } from '#services/blocks'
import {
  assertParentAllowed,
  assertPathFree,
  pathFor,
  rebuildChildPaths,
  snapshot,
} from '#services/pages'
import { audit } from '#services/audit'
import { announce } from '#services/events'
import { normalizeSeo } from '#validators/content'
import { actorOf } from '#services/actor'
import { applyWorkflow, denyPublish, transitionAction } from '#services/publishing'
import type { Block, FieldData, Status } from '#types/content'
import type { TermInput } from '#services/taxonomy'

export type PageValues = {
  title: string
  slug: string
  parentId?: number | null
  blocks: Block[]
  frontmatter?: Record<string, any>
  seo: Record<string, unknown>
  status?: Status
  publishAt?: DateTime | null
  unpublishAt?: DateTime | null
  locale?: string
  category?: TermInput | null
  tags?: TermInput[]
}

export type EditOptions = {
  onPublishDenied?: () => never
  publishedAt?: DateTime | null
  metadata?: Record<string, unknown>
}

export async function createPage(ctx: HttpContext, values: PageValues, options: EditOptions = {}) {
  const actor = actorOf(ctx)
  const seo = normalizeSeo(values.seo)
  const lookup = await blockTypeLookup()
  const blocks = coerceBlocks(values.blocks, lookup)
  assertValid(validateBlocks(blocks, lookup))
  const path = await pathFor(values.slug, values.parentId)
  const page = new Page()
  const recordMeta = await planRecordMeta(ctx, 'page', page, values)
  await assertPathFree(path, undefined, recordMeta.locale)

  page.merge({
    title: values.title,
    slug: values.slug,
    parentId: values.parentId ?? null,
    path,
    status: 'draft',
    blocks,
    frontmatter: (values.frontmatter ?? {}) as FieldData,
    fields: [],
    seo,
  })
  const { publishingWrite } = applyWorkflow(page, values)
  if (options.publishedAt !== undefined) page.publishedAt = options.publishedAt
  if (publishingWrite && !actor.can('pages:publish')) (options.onPublishDenied ?? denyPublish)()
  await recordMeta.beforeSave()
  await page.save()
  await recordMeta.afterSave()
  await snapshot(page, actor.user)
  await audit(ctx, 'page.created', page, {
    path: page.path,
    status: page.status,
    ...options.metadata,
  })
  await announce('page.created', page, { origin: ctx })
  return page
}

export async function updatePage(
  ctx: HttpContext,
  page: Page,
  values: PageValues,
  options: EditOptions = {}
) {
  const actor = actorOf(ctx)
  const seo = normalizeSeo(values.seo)
  const lookup = await blockTypeLookup()
  const blocks = coerceBlocks(values.blocks, lookup)
  const fields = page.fields ?? []
  const frontmatter = coerceData(fields, values.frontmatter ?? page.frontmatter ?? {}, lookup)
  assertValid([
    ...validateData(fields, frontmatter, lookup, 'frontmatter'),
    ...validateBlocks(blocks, lookup),
  ])
  await assertParentAllowed(page, values.parentId)
  const path = await pathFor(values.slug, values.parentId)
  const recordMeta = await planRecordMeta(ctx, 'page', page, values)
  await assertPathFree(path, page.id, recordMeta.locale)

  const moved = path !== page.path
  page.merge({
    title: values.title,
    slug: values.slug,
    parentId: values.parentId ?? null,
    path,
    blocks,
    frontmatter,
    seo,
  })
  const { from, publishingWrite } = applyWorkflow(page, values)
  if (options.publishedAt !== undefined) page.publishedAt = options.publishedAt
  if (publishingWrite && !actor.can('pages:publish')) (options.onPublishDenied ?? denyPublish)()
  await recordMeta.beforeSave()
  await page.save()
  await recordMeta.afterSave()
  if (moved) await rebuildChildPaths(page)
  await snapshot(page, actor.user)
  const { action, metadata } = transitionAction('page', from, page.status)
  await audit(ctx, action, page, { path: page.path, ...metadata, ...options.metadata })
  await announce('page.updated', page, { from, origin: ctx })
  return { page, from }
}

export async function changePageStatus(
  ctx: HttpContext,
  page: Page,
  to: Status,
  metadata: Record<string, unknown> = {}
) {
  if (page.status === to) return false
  const { from } = applyWorkflow(page, { status: to })
  await page.save()
  const transition = transitionAction('page', from, to)
  await audit(ctx, transition.action, page, {
    path: page.path,
    ...metadata,
    ...transition.metadata,
  })
  await announce('page.updated', page, { from, origin: ctx })
  return true
}
