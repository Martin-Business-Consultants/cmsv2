import { randomBytes } from 'node:crypto'
import { DateTime } from 'luxon'
import ApiToken from '#models/api_token'
import ServiceToken from '#models/service_token'
import { getSetting, getSettings, mergeSetting } from '#services/settings'
import { getSecret, setSecrets } from '#services/secrets'
import { audit, type OriginSource } from '#services/audit'

export const FRONTEND_SETTING = 'frontend'
export const GITHUB_SETTING = 'github'
export const RENDERS = ['static', 'server', 'hybrid'] as const

export type Render = (typeof RENDERS)[number]

export type Delivery = { render?: Render | null; webhook_url?: string | null }

export type BuildReport = {
  integration?: string
  integration_version?: string
  framework?: string
  framework_version?: string
  site_url?: string
  pages?: number
  duration_ms?: number
  render?: Render
  webhook_url?: string
  content_cursor?: string
  built_at: string
}

type FrontendSetting = { last_build?: BuildReport; delivery?: Delivery }

const TEXT_KEYS = [
  'integration',
  'integration_version',
  'framework',
  'framework_version',
  'site_url',
] as const

async function stored(): Promise<FrontendSetting> {
  const value = await getSetting<FrontendSetting>(FRONTEND_SETTING)
  return value && typeof value === 'object' ? value : {}
}

function pickDelivery(value: Partial<Delivery> | undefined | null): Delivery {
  const delivery: Delivery = {}
  if (value?.render) delivery.render = value.render
  if (value?.webhook_url) delivery.webhook_url = value.webhook_url
  return delivery
}

function sameDelivery(a: Delivery, b: Delivery) {
  return (a.render ?? null) === (b.render ?? null) && (a.webhook_url ?? null) === (b.webhook_url ?? null)
}

export function webUrl(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return null
  try {
    const url = new URL(value.trim())
    if ((url.protocol !== 'http:' && url.protocol !== 'https:') || !url.hostname) return null
    return url.toString().slice(0, 500)
  } catch {
    return null
  }
}

function purgeUrlOf(delivery: Delivery) {
  return delivery.render === 'server' || delivery.render === 'hybrid'
    ? (delivery.webhook_url ?? null)
    : null
}

function rebuiltOnly(delivery: Delivery) {
  return delivery.render !== 'server' && !purgeUrlOf(delivery)
}

function deliveryOf(settings: FrontendSetting): Delivery {
  if (settings.delivery && typeof settings.delivery === 'object') {
    return pickDelivery(settings.delivery)
  }
  return pickDelivery(settings.last_build)
}

export async function delivery() {
  return deliveryOf(await stored())
}

export async function pendingDelivery(): Promise<Delivery | null> {
  const settings = await stored()
  const reported = pickDelivery(settings.last_build)
  return sameDelivery(reported, deliveryOf(settings)) ? null : reported
}

export async function render() {
  return (await delivery()).render ?? null
}

export async function prerendered() {
  return (await render()) !== 'server'
}

export async function purgeUrl() {
  return purgeUrlOf(await delivery())
}

export async function purges() {
  return Boolean(await purgeUrl())
}

export async function lastBuild(): Promise<BuildReport | null> {
  const build = (await stored()).last_build
  return build && typeof build === 'object' && build.built_at ? build : null
}

export async function recordBuild(input: Record<string, unknown>, origin?: OriginSource) {
  const current = await stored()
  if (!('delivery' in current)) {
    await mergeSetting<FrontendSetting>(FRONTEND_SETTING, { delivery: deliveryOf(current) })
  }
  const build: Partial<BuildReport> = {}
  for (const key of TEXT_KEYS) {
    const value = input[key]
    if (value !== undefined && value !== null && String(value).trim()) {
      build[key] = String(value).slice(0, 100)
    }
  }
  for (const key of ['pages', 'duration_ms'] as const) {
    const value = Number.parseInt(String(input[key] ?? ''), 10)
    if (Number.isFinite(value)) build[key] = value
  }
  const reportedRender = String(input.render ?? '')
  if ((RENDERS as readonly string[]).includes(reportedRender)) build.render = reportedRender as Render
  const webhook = webUrl(input.webhook_url)
  if (webhook) build.webhook_url = webhook
  const cursor = String(input.content_cursor ?? '').slice(0, 200)
  if (cursor) build.content_cursor = cursor
  const report: BuildReport = { ...build, built_at: new Date().toISOString() }

  await mergeSetting<FrontendSetting>(FRONTEND_SETTING, { last_build: report })
  const { built_at: _builtAt, webhook_url: _webhookUrl, ...metadata } = report
  await audit(origin, 'frontend.built', null, metadata)

  const reported = pickDelivery(report)
  if (rebuiltOnly(await delivery()) && rebuiltOnly(reported)) {
    await mergeSetting<FrontendSetting>(FRONTEND_SETTING, { delivery: reported })
  }
  return report
}

export async function approveDelivery(origin?: OriginSource) {
  const reported = await pendingDelivery()
  if (!reported) return false
  await mergeSetting<FrontendSetting>(FRONTEND_SETTING, { delivery: reported })
  await audit(origin, 'frontend.delivery_approved', null, {
    render: reported.render ?? null,
    webhook_url: reported.webhook_url ?? null,
  })
  return true
}

export async function rotatePurgeSecret() {
  const secret = randomBytes(32).toString('hex')
  await setSecrets(FRONTEND_SETTING, { purge_secret: secret })
  return secret
}

export async function purgeSecret() {
  return (await getSecret(FRONTEND_SETTING, 'purge_secret')) ?? (await rotatePurgeSecret())
}

export async function siteUrl() {
  return (await getSettings()).siteBaseUrl || null
}

export async function githubRepo() {
  const value = await getSetting<{ frontend_github_repo?: string }>(GITHUB_SETTING)
  return value?.frontend_github_repo?.trim() || null
}

export async function githubToken() {
  return getSecret(GITHUB_SETTING, 'token')
}

export type ApiUse = { name: string; kind: 'personal' | 'service'; lastUsedAt: string }

export async function recentApiUse(days = 7, limit = 6): Promise<ApiUse[]> {
  const since = DateTime.now().minus({ days }).toSQL({ includeOffset: false })!
  const [people, services] = await Promise.all([
    ApiToken.query().where('last_used_at', '>=', since).preload('user'),
    ServiceToken.query()
      .apply((scopes) => scopes.active())
      .where('last_used_at', '>=', since),
  ])
  const uses: ApiUse[] = [
    ...people.map((token) => ({
      name: token.user?.displayName ?? 'Someone',
      kind: 'personal' as const,
      lastUsedAt: token.lastUsedAt!.toISO()!,
    })),
    ...services.map((token) => ({
      name: token.name,
      kind: 'service' as const,
      lastUsedAt: token.lastUsedAt!.toISO()!,
    })),
  ]
  return uses.sort((a, b) => b.lastUsedAt.localeCompare(a.lastUsedAt)).slice(0, limit)
}
