import type { HttpContext } from '@adonisjs/core/http'
import { errors } from '@vinejs/vine'
import { DateTime } from 'luxon'
import Global from '#models/global'
import {
  assertValid,
  coerceData,
  normalizeDefinitions,
  validateData,
  validateDefinitions,
} from '#services/fields'
import { blockTypeLookup } from '#services/blocks'
import { audit } from '#services/audit'
import { announce } from '#services/events'
import type { Field } from '#types/content'

export type GlobalDetails = {
  name: string
  slug: string
  description?: string | null
  icon?: string | null
}

export async function assertGlobalSlugFree(slug: string, exceptId?: number) {
  const query = Global.query().where('slug', slug)
  if (exceptId) query.whereNot('id', exceptId)
  const taken = await query.first()
  if (taken) {
    const message = taken.deletedAt
      ? 'A global in the trash uses this slug. Restore it or delete it permanently first.'
      : 'Another global already uses this slug'
    throw new errors.E_VALIDATION_ERROR([{ field: 'slug', message, rule: 'unique' }])
  }
}

export async function checkGlobalContent(fields: Field[], data: unknown) {
  const lookup = await blockTypeLookup()
  const coerced = coerceData(fields, data ?? {}, lookup)
  assertValid(validateData(fields, coerced, lookup))
  return coerced
}

export function checkGlobalFields(raw: unknown[]) {
  const fields = normalizeDefinitions(raw)
  assertValid(validateDefinitions(fields))
  return fields
}

export async function createGlobal(
  ctx: HttpContext,
  values: GlobalDetails,
  content: { fields?: Field[]; data?: Record<string, unknown> } = {}
) {
  await assertGlobalSlugFree(values.slug)
  const fields = content.fields ?? []
  const data = content.data ? await checkGlobalContent(fields, content.data) : {}
  const global = await Global.create({
    name: values.name,
    slug: values.slug,
    description: values.description ?? null,
    icon: values.icon || null,
    fields,
    data,
  })
  await audit(ctx, 'global.created', global, { slug: global.slug })
  await announce('global.created', global, { origin: ctx })
  return global
}

export async function updateGlobal(
  ctx: HttpContext,
  global: Global,
  values: GlobalDetails & { data: Record<string, unknown> }
) {
  const data = await checkGlobalContent(global.fields, values.data)
  await assertGlobalSlugFree(values.slug, global.id)
  global.merge({
    name: values.name,
    slug: values.slug,
    description: values.description ?? null,
    icon: values.icon || null,
    data,
  })
  await global.save()
  await audit(ctx, 'global.updated', global, { slug: global.slug })
  await announce('global.updated', global, { origin: ctx })
  return global
}

export async function updateGlobalFields(ctx: HttpContext, global: Global, fields: Field[]) {
  global.fields = fields
  await global.save()
  await audit(ctx, 'global.schema_updated', global, { slug: global.slug })
  await announce('global.updated', global, { origin: ctx })
  return global
}

export async function trashGlobal(
  ctx: HttpContext,
  global: Global,
  metadata: Record<string, unknown> = {}
) {
  await audit(ctx, 'global.deleted', global, { slug: global.slug, ...metadata })
  global.deletedAt = DateTime.now()
  await global.save()
  await announce('global.trashed', global, { origin: ctx })
}
