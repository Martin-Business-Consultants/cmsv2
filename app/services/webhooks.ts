import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { DateTime } from 'luxon'
import logger from '@adonisjs/core/services/logger'
import env from '#start/env'
import Webhook from '#models/webhook'
import WebhookDelivery from '#models/webhook_delivery'
import { WEBHOOK_EVENTS, type Announcement } from '#services/events'
import { plugins, type ActionPayload } from '#services/plugins'
import { safeFetch, validateOutboundUrl } from '#services/outbound_url'
import { assertValid, type FieldError } from '#services/fields'
import { audit, type OriginSource } from '#services/audit'

export const USER_AGENT = 'librepublish-webhooks/1'
export const SIGNATURE_HEADER = 'X-CMS-Signature'
export const PAYLOAD_LIMIT = 16_000
export const RESPONSE_LIMIT = 2_000
export const CONNECT_TIMEOUT = 5_000
export const TOTAL_TIMEOUT = 10_000
export const RECENT_DELIVERIES = 20
export const DEFAULT_LOCALE = 'en'

const RESERVED_HEADERS = new Set([
  'content-type',
  'content-length',
  'host',
  'transfer-encoding',
  'connection',
  SIGNATURE_HEADER.toLowerCase(),
])

const HEADER_NAME = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/

const CORE_GROUPS: [string, string][] = [
  ['Pages', 'page.'],
  ['Collection entries', 'entry.'],
  ['Globals', 'global.'],
]

const PAGE_KEYS = [
  'id',
  'slug',
  'path',
  'url',
  'title',
  'status',
  'locale',
  'published_at',
  'updated_at',
]
const ENTRY_KEYS = [
  'id',
  'slug',
  'collection_slug',
  'url',
  'title',
  'status',
  'locale',
  'published_at',
  'updated_at',
]

export type WebhookEventGroup = {
  label: string
  events: string[]
  source: 'core' | 'plugin'
  plugin: string | null
}

export type WebhookHealth = {
  state: 'inactive' | 'pending' | 'delivering' | 'failing'
  label: string
}

export type WebhookValues = {
  name: string
  url: string
  active: boolean
  events: string[]
  headers: Record<string, string>
  eventFilters: Record<string, unknown>
  secret?: string | null
}

export type DeliveryJobPayload = {
  webhookId: number
  event: string
  data: unknown
  test?: boolean
}

export function webhookEventGroups(): WebhookEventGroup[] {
  const core: WebhookEventGroup[] = CORE_GROUPS.map(([label, prefix]) => ({
    label,
    events: WEBHOOK_EVENTS.filter((event) => event.startsWith(prefix)),
    source: 'core',
    plugin: null,
  }))
  const extra: WebhookEventGroup[] = plugins.enabled(plugins.webhookEventGroups).map((group) => ({
    label: group.label,
    events: [...group.events],
    source: 'plugin',
    plugin: group.plugin,
  }))
  return [...core, ...extra].filter((group) => group.events.length)
}

export function webhookEvents() {
  return [...new Set(webhookEventGroups().flatMap((group) => group.events))]
}

export function generateSecret() {
  return `whsec_${randomBytes(32).toString('base64url')}`
}

export function sign(body: string, secret: string) {
  return `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`
}

export function verifySignature(body: string, secret: string, signature: string | null) {
  if (!signature) return false
  const expected = Buffer.from(sign(body, secret))
  const given = Buffer.from(signature)
  return expected.length === given.length && timingSafeEqual(expected, given)
}

export function siteKey() {
  const configured = env.get('SITE_KEY')
  if (configured) return configured
  try {
    return new URL(env.get('APP_URL')).hostname.split('.')[0] || 'localhost'
  } catch {
    return 'localhost'
  }
}

function isoSeconds(value: Date | DateTime) {
  const time = value instanceof Date ? DateTime.fromJSDate(value) : value
  return time.toUTC().startOf('second').toISO({ suppressMilliseconds: true })
}

function normalizeTime(value: unknown) {
  if (typeof value !== 'string' || !value) return value ?? null
  const parsed = DateTime.fromISO(value)
  return parsed.isValid ? isoSeconds(parsed) : value
}

function pick(data: Record<string, unknown>, keys: string[]) {
  return Object.fromEntries(keys.map((key) => [key, data[key] ?? null]))
}

export function contentData(kind: Announcement['kind'], data: Record<string, unknown>) {
  const withLocale = { locale: DEFAULT_LOCALE, ...data }
  const shaped =
    kind === 'page'
      ? pick(withLocale, PAGE_KEYS)
      : kind === 'entry'
        ? pick(withLocale, ENTRY_KEYS)
        : { ...data }
  if (typeof shaped.path === 'string') shaped.path = shaped.path.replace(/^\/+/, '')
  for (const key of ['published_at', 'updated_at']) {
    if (key in shaped) shaped[key] = normalizeTime(shaped[key])
  }
  return shaped
}

export function envelope(event: string, data: unknown, at = new Date()) {
  return { event, tenant: siteKey(), delivered_at: isoSeconds(at), data }
}

export function parseHeadersText(text: string | null | undefined) {
  const headers: Record<string, string> = {}
  for (const raw of (text ?? '').split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue
    const colon = line.indexOf(':')
    if (colon === -1) return { error: `Has a line that isn’t “Name: value”: ${line}` }
    const name = line.slice(0, colon).trim()
    if (!name) return { error: `Has a line with no header name: ${line}` }
    headers[name] = line.slice(colon + 1).trim()
  }
  const problem = headersProblem(headers)
  return problem ? { error: problem } : { headers }
}

export function headersProblem(headers: Record<string, unknown>) {
  for (const [name, value] of Object.entries(headers)) {
    if (!HEADER_NAME.test(name)) return `“${name}” isn’t a valid header name`
    if (RESERVED_HEADERS.has(name.toLowerCase())) return `“${name}” is set by the CMS`
    if (typeof value !== 'string') return `“${name}” must have a text value`
    if (/[\r\n\0]/.test(value)) return `“${name}” has a line break in its value`
  }
  return null
}

export function formatHeadersText(headers: Record<string, string> | null | undefined) {
  return Object.entries(headers ?? {})
    .map(([name, value]) => `${name}: ${value}`)
    .join('\n')
}

export function permitEventFilters(raw: unknown) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const permitted: Record<string, unknown> = {}
  for (const filter of plugins.enabled(plugins.webhookEventFilters)) {
    const value = filter.permit((raw as Record<string, unknown>)[filter.event])
    if (value !== null && value !== undefined && value !== '') permitted[filter.event] = value
  }
  return permitted
}

export function eventFiltersProblem(filters: Record<string, unknown>) {
  for (const [event, value] of Object.entries(filters)) {
    const problem = plugins.webhookEventFilter(event)?.validate?.(value) ?? null
    if (problem) return `${event}: ${problem}`
  }
  return null
}

export function eventsProblem(events: string[]) {
  if (!events.length) return 'Choose at least one event'
  const known = new Set(webhookEvents())
  const unknown = events.filter((event) => !known.has(event))
  return unknown.length ? `Unknown: ${unknown.join(', ')}` : null
}

export function matchesFilter(webhook: Webhook, event: string, data: unknown) {
  const filter = plugins.webhookEventFilter(event)
  if (!filter) return true
  const value = webhook.eventFilters?.[event]
  if (value === undefined || value === null) return true
  try {
    return filter.match(value, data)
  } catch (error) {
    logger.error({ err: error, event, webhook: webhook.id }, 'Webhook event filter failed')
    return false
  }
}

export function health(webhook: Webhook): WebhookHealth {
  if (!webhook.active) return { state: 'inactive', label: 'Inactive' }
  if (!webhook.lastStatus) return { state: 'pending', label: 'No deliveries yet' }
  if (webhook.lastStatus === 'success') return { state: 'delivering', label: 'Delivering' }
  return { state: 'failing', label: `Failing (${webhook.failureCount})` }
}

export function serializeWebhook(webhook: Webhook, options: { secret?: boolean } = {}) {
  return {
    id: webhook.id,
    name: webhook.name,
    url: webhook.url,
    active: webhook.active,
    events: webhook.events ?? [],
    headers: webhook.headers ?? {},
    headersText: formatHeadersText(webhook.headers),
    eventFilters: webhook.eventFilters ?? {},
    failureCount: webhook.failureCount,
    lastStatus: webhook.lastStatus,
    lastDeliveryAt: webhook.lastDeliveryAt?.toISO() ?? null,
    health: health(webhook),
    createdAt: webhook.createdAt.toISO(),
    updatedAt: webhook.updatedAt?.toISO() ?? null,
    ...(options.secret ? { secret: webhook.secret } : {}),
  }
}

export type SerializedWebhook = ReturnType<typeof serializeWebhook> & { secret?: string }

export function serializeDelivery(delivery: WebhookDelivery) {
  return {
    id: delivery.id,
    event: delivery.event,
    payload: delivery.payload,
    responseStatus: delivery.responseStatus,
    responseBody: delivery.responseBody,
    error: delivery.error,
    durationMs: delivery.durationMs,
    attempt: delivery.attempt,
    success: delivery.success,
    createdAt: delivery.createdAt.toISO(),
  }
}

export type SerializedDelivery = ReturnType<typeof serializeDelivery>

export async function recentDeliveries(webhook: Webhook, limit = RECENT_DELIVERIES) {
  return WebhookDelivery.query()
    .where('webhook_id', webhook.id)
    .orderBy('created_at', 'desc')
    .orderBy('id', 'desc')
    .limit(limit)
}

export async function createWebhook(values: WebhookValues, origin?: OriginSource) {
  const webhook = await Webhook.create({
    name: values.name,
    url: values.url,
    active: values.active,
    events: values.events,
    headers: values.headers,
    eventFilters: values.eventFilters,
    secret: values.secret || generateSecret(),
    failureCount: 0,
  })
  await audit(origin, 'webhook.created', webhook, { url: webhook.url, events: webhook.events })
  return webhook
}

export async function updateWebhook(
  webhook: Webhook,
  values: WebhookValues,
  origin?: OriginSource
) {
  webhook.merge({
    name: values.name,
    url: values.url,
    active: values.active,
    events: values.events,
    headers: values.headers,
    eventFilters: values.eventFilters,
  })
  if (values.secret) webhook.secret = values.secret
  await webhook.save()
  await audit(origin, 'webhook.updated', webhook, {
    url: webhook.url,
    events: webhook.events,
    active: webhook.active,
  })
  return webhook
}

export async function deleteWebhook(webhook: Webhook, origin?: OriginSource) {
  await audit(origin, 'webhook.deleted', webhook, { url: webhook.url })
  await WebhookDelivery.query().where('webhook_id', webhook.id).delete()
  await webhook.delete()
}

export async function rotateSecret(webhook: Webhook, origin?: OriginSource) {
  webhook.secret = generateSecret()
  await webhook.save()
  await audit(origin, 'webhook.secret_rotated', webhook)
  return webhook
}

async function dispatch(payload: DeliveryJobPayload) {
  const { default: WebhookDeliveryJob } = await import('#jobs/webhook_delivery_job')
  await WebhookDeliveryJob.dispatch(payload)
}

export async function sendTest(webhook: Webhook, origin?: OriginSource) {
  await dispatch({
    webhookId: webhook.id,
    event: 'page.updated',
    data: { test: true, message: 'Test delivery from CMS' },
    test: true,
  })
  await audit(origin, 'webhook.test_fired', webhook)
}

export async function queueEvent(event: string, data: unknown) {
  const webhooks = await Webhook.query().where('active', true).whereLike('events', `%"${event}"%`)
  let queued = 0
  for (const webhook of webhooks) {
    if (!(webhook.events ?? []).includes(event)) continue
    if (!matchesFilter(webhook, event, data)) continue
    await dispatch({ webhookId: webhook.id, event, data })
    queued++
  }
  return queued
}

export async function queueAnnouncement(announcement: Announcement) {
  if (!(WEBHOOK_EVENTS as string[]).includes(announcement.event)) return 0
  return queueEvent(announcement.event, contentData(announcement.kind, announcement.data))
}

function hasWebhookPayload(value: unknown): value is { webhookPayload: () => unknown } {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { webhookPayload?: unknown }).webhookPayload === 'function'
  )
}

export async function pluginEventData(action: ActionPayload) {
  const group = plugins.webhookEventGroup(action.action)
  if (group?.payload) return await group.payload(action)
  if (hasWebhookPayload(action.subject.record)) return await action.subject.record.webhookPayload()
  if (action.metadata.data !== undefined) return action.metadata.data
  const metadata = Object.fromEntries(
    Object.entries(action.metadata).filter(([key]) => key !== 'via')
  )
  return {
    id: action.subject.id,
    type: action.subject.type,
    label: action.subject.label,
    ...metadata,
  }
}

export async function queuePluginEvent(action: ActionPayload) {
  if (!plugins.webhookEventGroup(action.action)) return 0
  return queueEvent(action.action, await pluginEventData(action))
}

function describeError(error: unknown) {
  if (!(error instanceof Error)) return String(error)
  const cause = (error as { cause?: { code?: string } }).cause
  const code = (error as { code?: string }).code ?? cause?.code
  if (error.name === 'TimeoutError' || error.name === 'AbortError') {
    return `Timed out after ${TOTAL_TIMEOUT / 1000} s`
  }
  if (code === 'ECONNREFUSED') return 'Connection refused'
  if (code === 'ECONNRESET') return 'Connection reset'
  if (code === 'ENOTFOUND') return 'Host not found'
  return `${error.name}: ${error.message}`.slice(0, 1000)
}

export async function deliver(
  webhook: Webhook,
  event: string,
  data: unknown,
  attempt = 1
): Promise<WebhookDelivery> {
  const body = JSON.stringify(envelope(event, data))
  const started = performance.now()
  let status: number | null = null
  let responseBody: string | null = null
  let error: string | null = null
  try {
    const response = await safeFetch(
      webhook.url,
      {
        method: 'POST',
        headers: {
          ...(webhook.headers ?? {}),
          'Content-Type': 'application/json',
          'User-Agent': USER_AGENT,
          [SIGNATURE_HEADER]: sign(body, webhook.secret),
        },
        body,
      },
      { connectTimeout: CONNECT_TIMEOUT, timeout: TOTAL_TIMEOUT, maxBytes: 1024 * 1024 }
    )
    status = response.status
    const text = await response.text()
    responseBody = text.slice(0, RESPONSE_LIMIT) || null
  } catch (caught) {
    error = describeError(caught)
  }
  const success = status !== null && status >= 200 && status < 300
  const delivery = await WebhookDelivery.create({
    webhookId: webhook.id,
    event,
    payload: body.slice(0, PAYLOAD_LIMIT),
    responseStatus: status,
    responseBody,
    error: error ?? (success ? null : `Answered ${status}`),
    durationMs: Math.round(performance.now() - started),
    attempt,
    success,
  })
  const fresh = await Webhook.find(webhook.id)
  if (fresh) {
    fresh.lastDeliveryAt = DateTime.now()
    fresh.lastStatus = success ? 'success' : 'failure'
    fresh.failureCount = success ? 0 : fresh.failureCount + 1
    await fresh.save()
  }
  return delivery
}

export function isRetryable(delivery: WebhookDelivery) {
  if (delivery.success) return false
  const status = delivery.responseStatus
  if (status === null) return true
  return status === 408 || status === 425 || status === 429 || status >= 500
}

export type WebhookInput = {
  name: string
  url: string
  active: boolean
  events: string[]
  headersText?: string | null
  headers?: Record<string, string>
  eventFilters?: unknown
  secret?: string | null
}

export async function resolveWebhookValues(input: WebhookInput): Promise<WebhookValues> {
  const problems: FieldError[] = []
  const report = (field: string, message: string) => problems.push({ field, message, rule: field })
  if (!input.name) report('name', 'Give the webhook a name')
  const urlProblem = input.url ? await validateOutboundUrl(input.url) : 'Enter the URL to POST to'
  if (urlProblem) report('url', urlProblem)
  const events = [...new Set(input.events)]
  const eventProblem = eventsProblem(events)
  if (eventProblem) report('events', eventProblem)
  let headers: Record<string, string> = {}
  if (input.headersText !== undefined && input.headersText !== null) {
    const parsed = parseHeadersText(input.headersText)
    if ('error' in parsed) report('headersText', parsed.error!)
    else headers = parsed.headers
  } else if (input.headers) {
    const problem = headersProblem(input.headers)
    if (problem) report('headers', problem)
    else headers = input.headers
  }
  const eventFilters = permitEventFilters(input.eventFilters)
  const filterProblem = eventFiltersProblem(eventFilters)
  if (filterProblem) report('eventFilters', filterProblem)
  assertValid(problems)
  return {
    name: input.name,
    url: input.url,
    active: input.active,
    events,
    headers,
    eventFilters,
    secret: input.secret || null,
  }
}
