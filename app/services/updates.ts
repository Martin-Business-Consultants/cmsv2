import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { DateTime } from 'luxon'
import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'
import env from '#start/env'
import Upgrade from '#models/upgrade'
import { changeSetting, getSetting } from '#services/settings'
import { safeFetch } from '#services/outbound_url'

export const UPDATES_SETTING = 'updates'
export const STRATEGIES = ['manual', 'docker'] as const

export type Strategy = (typeof STRATEGIES)[number]

export type UpdatesSetting = {
  repo?: string | null
  latest_version?: string | null
  release_url?: string | null
  notes?: string | null
  published_at?: string | null
  checked_at?: string | null
  running_version?: string | null
}

export class GithubUnavailable extends Error {}

let pkg: { version: string; repository: unknown } | null = null

async function packageJson() {
  if (pkg) return pkg
  try {
    const parsed = JSON.parse(await readFile(app.makePath('package.json'), 'utf8'))
    pkg = { version: String(parsed.version ?? '0.0.0'), repository: parsed.repository ?? null }
  } catch {
    pkg = { version: '0.0.0', repository: null }
  }
  return pkg
}

export async function cmsVersion() {
  return (await packageJson()).version
}

export function repoFrom(value: unknown): string | null {
  const raw =
    typeof value === 'string'
      ? value
      : value && typeof value === 'object' && typeof (value as { url?: unknown }).url === 'string'
        ? (value as { url: string }).url
        : ''
  const text = raw.trim()
  if (!text) return null
  const short = text.match(/^(?:github:)?([\w.-]+)\/([\w.-]+?)(?:\.git)?$/)
  if (short) return `${short[1]}/${short[2]}`
  const url = text.match(/github\.com[/:]([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/)
  return url ? `${url[1]}/${url[2]}` : null
}

export async function updateRepo() {
  const configured = env.get('CMS_UPDATE_REPO')?.trim()
  if (configured) return repoFrom(configured) ?? configured
  return repoFrom((await packageJson()).repository)
}

export function checking() {
  return env.get('CMS_UPDATE_CHECK') !== false
}

export function strategy(): Strategy {
  const configured = env.get('CMS_UPDATES')
  if (configured) return configured
  return existsSync('/.dockerenv') ? 'docker' : 'manual'
}

function parts(version: string) {
  const [core, pre] = version.replace(/^v/i, '').split('-', 2)
  return { numbers: core.split('.').map((part) => Number.parseInt(part, 10) || 0), pre }
}

export function compareVersions(a: string, b: string) {
  const left = parts(a)
  const right = parts(b)
  for (let index = 0; index < Math.max(left.numbers.length, right.numbers.length); index++) {
    const difference = (left.numbers[index] ?? 0) - (right.numbers[index] ?? 0)
    if (difference) return Math.sign(difference)
  }
  if (left.pre && !right.pre) return -1
  if (!left.pre && right.pre) return 1
  return (left.pre ?? '').localeCompare(right.pre ?? '')
}

export async function storedUpdates(): Promise<UpdatesSetting> {
  const value = await getSetting<UpdatesSetting>(UPDATES_SETTING)
  return value && typeof value === 'object' ? value : {}
}

async function mergeUpdates(values: Partial<UpdatesSetting>) {
  await changeSetting<UpdatesSetting>(UPDATES_SETTING, (current) => ({
    ...(current && typeof current === 'object' ? current : {}),
    ...values,
  }))
}

function githubApi() {
  return (env.get('CMS_GITHUB_API_URL') || 'https://api.github.com').replace(/\/+$/, '')
}

function failure(status: number, message: string | null, repo: string) {
  const token = Boolean(env.get('CMS_GITHUB_TOKEN'))
  if (status === 401) {
    return token
      ? 'GitHub refused the token: it’s wrong or has expired.'
      : 'GitHub needs CMS_GITHUB_TOKEN for that.'
  }
  if (status === 403) return `GitHub refused: ${message ?? 'the token lacks access'}.`
  if (status === 404) {
    return `GitHub has no releases for ${repo} that this install can see${token ? '' : ' (a private repository needs CMS_GITHUB_TOKEN)'}.`
  }
  return `GitHub answered ${status}${message ? `: ${message}` : ''}.`
}

export async function checkNow() {
  const repo = await updateRepo()
  if (!repo) throw new GithubUnavailable('No repository to check: set CMS_UPDATE_REPO.')
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': `librepublish/${await cmsVersion()}`,
  }
  const token = env.get('CMS_GITHUB_TOKEN')
  if (token) headers.Authorization = `Bearer ${token}`
  let response: Response
  try {
    response = await safeFetch(
      `${githubApi()}/repos/${repo}/releases/latest`,
      { headers },
      { timeout: 15_000, connectTimeout: 5_000 }
    )
  } catch (error) {
    throw new GithubUnavailable(`Couldn’t reach GitHub (${(error as Error).message}).`)
  }
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>
  if (!response.ok) {
    throw new GithubUnavailable(
      failure(response.status, typeof body.message === 'string' ? body.message : null, repo)
    )
  }
  const values: UpdatesSetting = {
    repo,
    latest_version: String(body.tag_name ?? '').replace(/^v/i, '') || null,
    release_url: typeof body.html_url === 'string' ? body.html_url : null,
    notes: typeof body.body === 'string' ? body.body : null,
    published_at: typeof body.published_at === 'string' ? body.published_at : null,
    checked_at: new Date().toISOString(),
  }
  await mergeUpdates(values)
  return values
}

export async function checkQuietly() {
  try {
    return await checkNow()
  } catch (error) {
    logger.warn({ err: error }, 'Update check failed')
    return null
  }
}

export async function updateAvailable(stored?: UpdatesSetting) {
  const latest = (stored ?? (await storedUpdates())).latest_version
  if (!latest) return false
  return compareVersions(latest, await cmsVersion()) > 0
}

export async function updateNotice() {
  const stored = await storedUpdates()
  if (!(await updateAvailable(stored))) return null
  return { version: stored.latest_version!, url: stored.release_url ?? null }
}

export function updateCommands(tag: string, via: Strategy = strategy()) {
  if (via === 'docker') {
    return [
      'git fetch --tags',
      `git checkout ${tag}`,
      'docker compose up -d --build',
    ]
  }
  return [
    'git fetch --tags',
    `git checkout ${tag}`,
    'pnpm install --frozen-lockfile && node ace build',
    'cd build && pnpm install --prod --frozen-lockfile',
    'node ace cms:backup && node ace migration:run --force',
    'systemctl restart librepublish',
  ]
}

export function strategyDescription(via: Strategy = strategy()) {
  return via === 'docker'
    ? 'Docker: rebuild the image on the new tag and recreate the container. It backs up the data directory before migrating.'
    : 'By hand on the server: check out the new tag, rebuild, back up, migrate and restart.'
}

export async function recordRunningVersion() {
  const version = await cmsVersion()
  let previous: string | null = null
  await changeSetting<UpdatesSetting>(UPDATES_SETTING, (current) => {
    const base = current && typeof current === 'object' ? current : {}
    if (base.running_version && base.running_version !== version) previous = base.running_version
    return { ...base, running_version: version }
  })
  if (!previous) return null
  return Upgrade.create({
    fromVersion: previous,
    toVersion: version,
    via: strategy(),
    status: 'succeeded',
    finishedAt: DateTime.now(),
  })
}

export async function pastUpgrades(limit = 10) {
  return Upgrade.query()
    .apply((scopes) => scopes.ordered())
    .preload('requestedBy')
    .limit(limit)
}

function iso(value: DateTime | null | undefined) {
  return value?.toUTC().toISO({ suppressMilliseconds: true }) ?? null
}

export function serializeUpgrade(upgrade: Upgrade) {
  return {
    id: upgrade.id,
    from_version: upgrade.fromVersion,
    to_version: upgrade.toVersion,
    status: upgrade.status,
    via: upgrade.via,
    requested_by: upgrade.requestedBy?.displayName ?? null,
    started_at: iso(upgrade.createdAt),
    finished_at: iso(upgrade.finishedAt),
    log_url: upgrade.externalUrl,
    message: upgrade.message,
  }
}

export async function updatesSummary() {
  await recordRunningVersion().catch(() => null)
  const stored = await storedUpdates()
  const repo = await updateRepo()
  const latest = stored.latest_version
  return {
    version: await cmsVersion(),
    update_available: await updateAvailable(stored),
    latest_release: latest
      ? {
          version: latest,
          url: stored.release_url ?? null,
          published_at: stored.published_at ?? null,
          notes: stored.notes ?? null,
        }
      : null,
    checked_at: stored.checked_at ?? null,
    daily_check: checking() && Boolean(repo),
    repo,
    updates_by: strategy(),
    not_set_up_because: 'Updating from the admin isn’t available: updates run on the server.',
    commands: latest ? updateCommands(`v${latest}`) : null,
    past_updates: (await pastUpgrades()).map(serializeUpgrade),
  }
}

export type UpdatesSummary = Awaited<ReturnType<typeof updatesSummary>>
