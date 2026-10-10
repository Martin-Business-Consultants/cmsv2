import { createHmac } from 'node:crypto'
import { performance } from 'node:perf_hooks'
import logger from '@adonisjs/core/services/logger'
import env from '#start/env'
import Page from '#models/page'
import Entry from '#models/entry'
import Global from '#models/global'
import Redirect from '#models/redirect'
import {
  plugins,
  type DeployAttempt,
  type DeployChange,
  type DeployConfig,
  type DeployProviderDefinition,
} from '#services/plugins'
import { changeSetting, getSetting } from '#services/settings'
import { safeFetch } from '#services/outbound_url'
import { siteKey } from '#services/webhooks'
import { audit, type OriginSource } from '#services/audit'
import * as frontend from '#services/frontend'

export type { DeployAttempt, DeployChange, DeployConfig }

export const DEPLOY_SETTING = 'deploy'
export const DEBOUNCE_SECONDS = 60
export const MAX_LOG_SIZE = 20
export const MAX_PENDING = 200
export const USER_AGENT = 'librepublish-deploy/1'
export const CONNECT_TIMEOUT = 5_000
export const TOTAL_TIMEOUT = 10_000
export const PURGE_EVENT = 'cms.purge'
export const GITHUB_EVENT_TYPE = 'cms-publish'
export const GITHUB_MAX_CHANGES = 50

export type DeployStatus = 'scheduled' | 'success' | 'failure' | 'disabled' | 'skipped'

export type DeployLogEntry = {
  at: string
  status: DeployStatus
  reason?: string
  via?: string
  changes?: number
  http_status?: number
  error?: string
  duration_ms?: number
}

export type DeploySettings = DeployConfig & {
  pending_changes?: DeployChange[]
  scheduled_at?: string | null
  last_reason?: string | null
  last_status?: DeployStatus | null
  last_fired_at?: string | null
  log?: DeployLogEntry[]
}

export type DeployProvider = Pick<DeployProviderDefinition, 'key' | 'label'> & {
  configured: (config: DeployConfig) => Promise<boolean>
  target: (config: DeployConfig) => Promise<string | null>
  fire: DeployProviderDefinition['fire']
}

function hostOf(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return null
  try {
    return new URL(value.trim()).hostname || null
  } catch {
    return null
  }
}

function describeError(error: unknown) {
  if (!(error instanceof Error)) return String(error)
  const code = (error as { code?: string }).code ?? (error.cause as { code?: string })?.code
  if (error.name === 'TimeoutError' || error.name === 'AbortError') {
    return `Timed out after ${TOTAL_TIMEOUT / 1000} s`
  }
  if (code === 'ECONNREFUSED') return 'Connection refused'
  if (code === 'ECONNRESET') return 'Connection reset'
  if (code === 'ENOTFOUND') return 'Host not found'
  return `${error.name}: ${error.message}`.slice(0, 500)
}

async function attemptOf(request: () => Promise<Response>): Promise<DeployAttempt> {
  try {
    const response = await request()
    return {
      status: response.ok ? 'success' : 'failure',
      httpStatus: response.status,
      error: null,
    }
  } catch (error) {
    return { status: 'failure', httpStatus: null, error: describeError(error) }
  }
}

function buildHook(key: string, label: string): DeployProvider {
  return {
    key,
    label,
    configured: async (config) => /^https?:\/\//.test(String(config.url ?? '')),
    target: async (config) => hostOf(config.url),
    fire: async ({ config }) =>
      attemptOf(() =>
        safeFetch(
          String(config.url),
          { method: 'POST', headers: { 'User-Agent': USER_AGENT } },
          { timeout: TOTAL_TIMEOUT, connectTimeout: CONNECT_TIMEOUT }
        )
      ),
  }
}

function githubApi() {
  return (env.get('CMS_GITHUB_API_URL') || 'https://api.github.com').replace(/\/+$/, '')
}

const github: DeployProvider = {
  key: 'github',
  label: 'GitHub',
  configured: async () =>
    Boolean((await frontend.githubRepo()) && (await frontend.githubToken())),
  target: async () => frontend.githubRepo(),
  fire: async ({ reason, changes }) => {
    const repo = await frontend.githubRepo()
    const token = await frontend.githubToken()
    if (!repo || !token) {
      return { status: 'failure', httpStatus: null, error: 'GitHub repository or token not set' }
    }
    const payload: Record<string, unknown> = {
      reason,
      site: siteKey(),
      changes: changes.slice(0, GITHUB_MAX_CHANGES),
    }
    if (changes.length > GITHUB_MAX_CHANGES) payload.truncated = true
    return attemptOf(() =>
      safeFetch(
        `${githubApi()}/repos/${repo}/dispatches`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'Content-Type': 'application/json',
            'User-Agent': USER_AGENT,
          },
          body: JSON.stringify({ event_type: GITHUB_EVENT_TYPE, client_payload: payload }),
        },
        { timeout: TOTAL_TIMEOUT, connectTimeout: CONNECT_TIMEOUT }
      )
    )
  },
}

const CORE_PROVIDERS: DeployProvider[] = [
  buildHook('build_hook', 'Build hook'),
  buildHook('cloudflare', 'Cloudflare (Pages or Workers Builds deploy hook)'),
  github,
]

export function providers(): DeployProvider[] {
  const additions = plugins
    .enabled(plugins.deployProviders)
    .filter((definition) => !CORE_PROVIDERS.some((core) => core.key === definition.key))
    .map((definition) => ({
      key: definition.key,
      label: definition.label,
      configured: async (config: DeployConfig) => Boolean(await definition.configured(config)),
      target: async (config: DeployConfig) => (await definition.target?.(config)) ?? null,
      fire: definition.fire,
    }))
  return [...CORE_PROVIDERS, ...additions]
}

export function providerFor(config: DeployConfig) {
  const all = providers()
  const chosen = all.find((provider) => provider.key === config.provider)
  if (chosen) return chosen
  const fallback = /^https?:\/\//.test(String(config.url ?? '')) ? 'build_hook' : 'github'
  return all.find((provider) => provider.key === fallback)!
}

export async function deployConfig(): Promise<DeploySettings> {
  const value = await getSetting<DeploySettings>(DEPLOY_SETTING)
  return value && typeof value === 'object' ? value : {}
}

async function changeDeploy(change: (current: DeploySettings) => Partial<DeploySettings>) {
  let result: DeploySettings = {}
  await changeSetting<DeploySettings>(DEPLOY_SETTING, (current) => {
    const base = current && typeof current === 'object' ? current : {}
    result = { ...base, ...change(base) }
    return result
  })
  return result
}

export function isPaused(config: DeploySettings) {
  return config.paused === true
}

export async function isReady(config?: DeploySettings) {
  const settings = config ?? (await deployConfig())
  return (await providerFor(settings).configured(settings)) || (await frontend.purges())
}

export type DeployInput = { provider?: string | null; url?: string | null; paused?: unknown }

export async function configure(input: DeployInput, origin?: OriginSource) {
  const incoming: Partial<DeploySettings> = {}
  if (input.provider !== undefined && providers().some((p) => p.key === input.provider)) {
    incoming.provider = input.provider ?? undefined
  }
  if (input.url !== undefined) incoming.url = (input.url ?? '').trim()
  if (input.paused !== undefined) {
    incoming.paused = input.paused === true || input.paused === 'true' || input.paused === '1'
  }
  const saved = await changeDeploy(() => incoming)
  await audit(origin, 'settings.deploy_updated', null, {
    url_set: Boolean(saved.url),
    paused: saved.paused === true,
    provider: saved.provider ?? null,
  })
  return saved
}

function tagPath(path: string) {
  return path === 'home' ? '' : path
}

export async function changeFrom(event: string, subject: unknown): Promise<DeployChange> {
  const describe = (
    kind: string,
    id: number,
    tags: string[],
    extra: { path?: string | null; locale?: string | null } = {}
  ): DeployChange => {
    const change: DeployChange = { event, kind, id, tags }
    if (extra.path) change.path = extra.path
    if (extra.locale) change.locale = extra.locale
    return change
  }
  if (subject instanceof Page) {
    return describe('page', subject.id, [`page:${tagPath(subject.path)}`, 'pages', 'sitemap'], {
      path: subject.publicPath,
      locale: subject.locale,
    })
  }
  if (subject instanceof Entry) {
    if (!subject.$preloaded.collection) await subject.load('collection')
    const collection = subject.collection?.slug ?? ''
    return describe(
      'entry',
      subject.id,
      [`entry:${collection}/${subject.slug}`, `collection:${collection}`, 'sitemap'],
      { path: subject.publicPath, locale: subject.locale }
    )
  }
  if (subject instanceof Global) {
    return describe('global', subject.id, [`global:${subject.slug}`])
  }
  if (subject instanceof Redirect) return describe('redirect', subject.id, ['redirects'])
  if (subject === 'settings') return { event, kind: 'settings', tags: ['site', 'sitemap'] }
  return { event, tags: [] }
}

export function mergeChanges(changes: DeployChange[]) {
  const merged = new Map<string, DeployChange>()
  for (const change of changes) {
    const key = `${change.kind ?? ''}:${change.id ?? change.event}`
    const previous = merged.get(key)
    merged.delete(key)
    merged.set(key, {
      ...change,
      tags: [...new Set([...(previous?.tags ?? []), ...(change.tags ?? [])])],
    })
  }
  return [...merged.values()]
}

function stamp(reason: string) {
  const at = `${new Date().toISOString()}#${Math.random().toString(36).slice(2, 8)}`
  return changeDeploy(() => ({ scheduled_at: at, last_reason: reason })).then(() => at)
}

async function dispatchTrigger(scheduledAt: string, reason: string, delaySeconds: number) {
  const { default: DeployTriggerJob } = await import('#jobs/deploy_trigger_job')
  const dispatcher = DeployTriggerJob.dispatch({ scheduledAt, reason })
  if (delaySeconds > 0) {
    await dispatcher
      .in(`${delaySeconds}s`)
      .dedup({ id: 'debounced', ttl: `${delaySeconds}s`, replace: true })
      .run()
  } else {
    await dispatcher.run()
  }
}

export async function scheduleDeploy(reason: string, subject?: unknown) {
  try {
    const config = await deployConfig()
    if (isPaused(config) || !(await isReady(config))) return false
    const change = await changeFrom(reason, subject)
    await changeDeploy((current) => ({
      pending_changes: [...(current.pending_changes ?? []), change].slice(-MAX_PENDING),
    }))
    const scheduledAt = await stamp(reason)
    await dispatchTrigger(scheduledAt, reason, DEBOUNCE_SECONDS)
    return true
  } catch (error) {
    logger.error({ err: error, reason }, 'Could not schedule a deploy')
    return false
  }
}

export async function triggerDeploy(reason = 'manual') {
  const scheduledAt = await stamp(reason)
  await dispatchTrigger(scheduledAt, reason, 0)
}

async function recordAttempt(entry: Omit<DeployLogEntry, 'at'>) {
  const at = new Date().toISOString()
  const clean = Object.fromEntries(
    Object.entries({ at, ...entry }).filter(([, value]) => value !== null && value !== undefined)
  ) as DeployLogEntry
  await changeDeploy((current) => ({
    log: [clean, ...(current.log ?? [])].slice(0, MAX_LOG_SIZE),
    last_status: entry.status,
    last_fired_at: at,
  }))
}

function sameChange(a: DeployChange, b: DeployChange) {
  return JSON.stringify(a) === JSON.stringify(b)
}

async function settle(taken: DeployChange[]) {
  if (!taken.length) return
  await changeDeploy((current) => {
    const remaining = [...(current.pending_changes ?? [])]
    for (const change of taken) {
      const index = remaining.findIndex((candidate) => sameChange(candidate, change))
      if (index !== -1) remaining.splice(index, 1)
    }
    return { pending_changes: remaining }
  })
}

export function signPurge(body: string, secret: string) {
  return `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`
}

export function purgeBody(reason: string, changes: DeployChange[], all: boolean) {
  return {
    event: PURGE_EVENT,
    reason,
    site: siteKey(),
    all,
    tags: [...new Set(changes.flatMap((change) => change.tags ?? []))],
    changes,
    sent_at: new Date().toISOString(),
  }
}

export async function firePurge(reason: string, changes: DeployChange[], all: boolean) {
  const url = await frontend.purgeUrl()
  if (!url) return { status: 'failure', httpStatus: null, error: 'No purge URL' } as DeployAttempt
  const secret = await frontend.purgeSecret()
  const body = JSON.stringify(purgeBody(reason, changes, all))
  return attemptOf(() =>
    safeFetch(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': USER_AGENT,
          'X-CMS-Event': PURGE_EVENT,
          'X-CMS-Signature': signPurge(body, secret),
        },
        body,
      },
      { timeout: TOTAL_TIMEOUT, connectTimeout: CONNECT_TIMEOUT }
    )
  )
}

export async function claim(scheduledAt: string) {
  let claimed: DeploySettings | null = null
  await changeDeploy((current) => {
    if (current.scheduled_at !== scheduledAt) return {}
    claimed = current
    return { scheduled_at: null }
  })
  return claimed as DeploySettings | null
}

export async function triggerNow(scheduledAt: string, reason: string) {
  const settings = await claim(scheduledAt)
  if (!settings) return false

  const taken = settings.pending_changes ?? []
  const changes = mergeChanges(taken)
  const provider = providerFor(settings)
  const manual = reason === 'manual'
  const purging = await frontend.purges()
  const actions: ('purge' | 'build')[] = []
  if (purging) actions.push('purge')
  if (
    (await provider.configured(settings)) &&
    (manual || (await frontend.prerendered()) || !purging)
  ) {
    actions.push('build')
  }

  if (!actions.length || isPaused(settings)) {
    await recordAttempt({ status: 'disabled', reason, changes: changes.length })
    await settle(taken)
    return true
  }

  const results: DeployAttempt[] = []
  for (const action of actions) {
    const started = performance.now()
    let attempt: DeployAttempt
    try {
      attempt =
        action === 'purge'
          ? await firePurge(reason, changes, manual)
          : await provider.fire({ reason, changes, config: settings })
    } catch (error) {
      attempt = { status: 'failure', httpStatus: null, error: describeError(error) }
    }
    await recordAttempt({
      status: attempt.status,
      reason,
      via: action === 'purge' ? 'purge' : provider.key,
      changes: changes.length,
      http_status: attempt.httpStatus ?? undefined,
      error: attempt.error ?? undefined,
      duration_ms: Math.round(performance.now() - started),
    })
    results.push(attempt)
  }
  if (results.every((attempt) => attempt.status === 'success')) await settle(taken)
  return true
}

export async function deploySummary() {
  const settings = await deployConfig()
  const provider = providerFor(settings)
  return {
    provider: provider.key,
    url_set: Boolean(settings.url),
    url_host: hostOf(settings.url),
    render: await frontend.render(),
    purges: await frontend.purges(),
    ready: await isReady(settings),
    paused: isPaused(settings),
    scheduled_at: settings.scheduled_at?.split('#')[0] ?? null,
    last_status: settings.last_status ?? null,
    last_fired_at: settings.last_fired_at ?? null,
    last_reason: settings.last_reason ?? null,
    log: settings.log ?? [],
  }
}

export type DeploySummary = Awaited<ReturnType<typeof deploySummary>>
