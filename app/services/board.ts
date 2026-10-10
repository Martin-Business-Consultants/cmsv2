import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import type Collection from '#models/collection'
import type Entry from '#models/entry'
import type User from '#models/user'
import { BUILD_INLINE_TYPES, type BuildConfig, type Field } from '#types/content'
import { coerceData, validateData, type FieldError } from '#services/fields'
import { blockTypeLookup } from '#services/blocks'
import { getSettings, siteTimeZone } from '#services/settings'
import { applyWorkflow, transitionAction } from '#services/publishing'
import { snapshot } from '#services/entries'
import { audit } from '#services/audit'
import { announce } from '#services/events'

export type Board = {
  field: Field
  labels: { off: string; on: string }
  cardFields: Field[]
  alsoFields: Field[]
  moveFields: Field[]
  publishes: boolean
}

const LOCAL_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/

function names(raw: unknown) {
  const list = Array.isArray(raw) ? raw : raw === undefined || raw === null ? [] : [raw]
  return [...new Set(list.map((name) => String(name).trim()).filter(Boolean))]
}

function truthy(value: unknown) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value === 1
  if (typeof value === 'string') return ['1', 'true', 't', 'on', 'yes'].includes(value.toLowerCase())
  return false
}

export function castBoolean(value: unknown) {
  return truthy(value)
}

export function normalizeBuildConfig(raw: unknown): BuildConfig {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const input = raw as Record<string, unknown>
  const field = String(input.field ?? '').trim()
  if (!field) return {}
  const config: BuildConfig = { field }
  const off = String(input.off_label ?? '').trim()
  const on = String(input.on_label ?? '').trim()
  if (off) config.off_label = off
  if (on) config.on_label = on
  config.card_fields = names(input.card_fields)
  const also = names(input.also_fields)
  if (also.length) config.also_fields = also
  if (truthy(input.also_publish)) config.also_publish = true
  return config
}

export function buildConfigErrors(config: BuildConfig, fields: Field[]): FieldError[] {
  const out: FieldError[] = []
  const fail = (message: string) =>
    out.push({ field: 'buildConfig', message: `Build board ${message}`, rule: 'board' })
  const find = (name: string) => fields.find((field) => field.name === name)
  if (!config.field) return out
  const target = find(config.field)
  if (!target) fail(`field ${config.field} is not in this collection's schema`)
  else if (target.type !== 'boolean') {
    fail(`field ${config.field} must be a boolean, not ${target.type}`)
  }
  for (const name of config.card_fields ?? []) {
    const field = find(name)
    if (!field) fail(`card field ${name} is not in this collection's schema`)
    else if (!BUILD_INLINE_TYPES.includes(field.type)) {
      fail(`card field ${name} is a ${field.type}, which cannot be edited on a card`)
    }
  }
  for (const name of config.also_fields ?? []) {
    const field = find(name)
    if (!field) fail(`field ${name} is not in this collection's schema`)
    else if (field.type !== 'boolean') {
      fail(`field ${name} must be a boolean to move with the columns, not ${field.type}`)
    }
  }
  return out
}

export function buildSettings(collection: Collection): BuildConfig {
  const config = collection.buildConfig
  return config && typeof config === 'object' && !Array.isArray(config) ? config : {}
}

function fieldNamed(collection: Collection, name: unknown) {
  if (typeof name !== 'string' || !name) return null
  return (collection.fields ?? []).find((field) => field.name === name) ?? null
}

export function boardOf(collection: Collection): Board | null {
  const settings = buildSettings(collection)
  const field = fieldNamed(collection, settings.field)
  if (!field || field.type !== 'boolean') return null
  const pick = (list: unknown, accept: (field: Field) => boolean) =>
    names(list)
      .map((name) => fieldNamed(collection, name))
      .filter((found): found is Field => !!found && found.name !== field.name && accept(found))
  const alsoFields = pick(settings.also_fields, (found) => found.type === 'boolean')
  return {
    field,
    labels: { off: settings.off_label || 'Off', on: settings.on_label || 'On' },
    cardFields: pick(settings.card_fields, (found) => BUILD_INLINE_TYPES.includes(found.type)),
    alsoFields,
    moveFields: [field, ...alsoFields],
    publishes: Boolean(settings.also_publish),
  }
}

export function booleanFields(collection: Collection) {
  return (collection.fields ?? []).filter((field) => field.type === 'boolean')
}

export function booleanField(collection: Collection, name: unknown) {
  const field = fieldNamed(collection, name)
  return field?.type === 'boolean' ? field : null
}

export function inlineFields(collection: Collection) {
  return (collection.fields ?? []).filter((field) => BUILD_INLINE_TYPES.includes(field.type))
}

export function inlineField(collection: Collection, name: unknown) {
  const field = fieldNamed(collection, name)
  return field && BUILD_INLINE_TYPES.includes(field.type) ? field : null
}

export function flagOf(entry: Entry, name: string) {
  return truthy((entry.data ?? {})[name])
}

export function flagsOf(entries: Entry[], fields: Field[]) {
  return Object.fromEntries(
    entries.map((entry) => [
      entry.id,
      Object.fromEntries(fields.map((field) => [field.name, flagOf(entry, field.name)])),
    ])
  )
}

export function canMoveCards(board: Board | null, can: (capability: string) => boolean) {
  if (!board || !can('entries:write')) return false
  return !board.publishes || can('entries:publish')
}

export async function inlineValue(field: Field, raw: unknown) {
  if (field.type === 'boolean') return truthy(raw)
  if (raw === undefined || raw === null || String(raw).trim() === '') return null
  if (field.type === 'datetime' && LOCAL_DATETIME.test(String(raw))) {
    const zone = siteTimeZone(await getSettings())
    const parsed = DateTime.fromISO(String(raw), { zone })
    return parsed.isValid ? parsed.toUTC().toISO({ suppressMilliseconds: true }) : String(raw)
  }
  return coerceData([field], { [field.name]: raw }, await blockTypeLookup())[field.name]
}

export type Actor = { ctx: HttpContext; user: User | null }

export async function setField(
  actor: Actor,
  entry: Entry,
  collection: Collection,
  field: Field,
  value: unknown,
  { keepNil = false } = {}
): Promise<FieldError[]> {
  if (value !== null && value !== undefined) {
    const errors = validateData([{ ...field, required: false }], { [field.name]: value }, new Map())
    if (errors.length) return errors
  }
  const data = { ...(entry.data ?? {}) }
  if ((value === null || value === undefined) && !keepNil) delete data[field.name]
  else data[field.name] = value ?? null
  entry.data = data
  await entry.save()
  await snapshot(entry, actor.user)
  await audit(actor.ctx, 'entry.updated', entry, {
    collection: collection.slug,
    slug: entry.slug,
    field: field.name,
    to: value ?? null,
    status: entry.status,
  })
  await announce('entry.updated', entry, { from: entry.status, origin: actor.ctx })
  return []
}

export async function placeOnBoard(
  actor: Actor,
  entry: Entry,
  collection: Collection,
  board: Board,
  on: boolean
) {
  const written = board.moveFields.map((field) => field.name)
  const data = { ...(entry.data ?? {}) }
  for (const name of written) data[name] = on
  entry.data = data
  const { from } = board.publishes
    ? applyWorkflow(entry, { status: on ? 'published' : 'draft' })
    : { from: entry.status }
  await entry.save()
  await snapshot(entry, actor.user)
  const { action, metadata } = transitionAction('entry', from, entry.status)
  await audit(actor.ctx, action, entry, {
    collection: collection.slug,
    ...metadata,
    fields: written,
    to: on,
  })
  await announce('entry.updated', entry, { from, origin: actor.ctx })
  return written
}

export function fieldLabel(field: Field) {
  if (field.label) return field.label
  const words = field.name.replace(/[_-]+/g, ' ').trim()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

export function inputValue(field: Field, value: unknown, zone: string) {
  if (field.type === 'boolean') return truthy(value)
  if (value === undefined || value === null) return ''
  if (field.type === 'datetime') {
    const parsed = DateTime.fromISO(String(value), { zone: 'utc' }).setZone(zone)
    return parsed.isValid ? parsed.toFormat("yyyy-MM-dd'T'HH:mm") : ''
  }
  return String(value)
}

export function serializeBoard(board: Board) {
  const shape = (field: Field) => ({
    name: field.name,
    label: fieldLabel(field),
    type: field.type,
    options: field.options ?? [],
  })
  return {
    field: shape(board.field),
    labels: board.labels,
    cardFields: board.cardFields.map(shape),
    moveFields: board.moveFields.map(shape),
    publishes: board.publishes,
  }
}

export async function boardCards(board: Board, entries: Entry[]) {
  const zone = siteTimeZone(await getSettings())
  return entries.map((entry) => ({
    id: entry.id,
    title: entry.title,
    slug: entry.slug,
    status: entry.status,
    isLive: entry.isLive,
    on: flagOf(entry, board.field.name),
    values: Object.fromEntries(
      board.cardFields.map((field) => [
        field.name,
        inputValue(field, (entry.data ?? {})[field.name], zone),
      ])
    ),
  }))
}
