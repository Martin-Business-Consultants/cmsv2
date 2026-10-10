import db from '@adonisjs/lucid/services/db'
import emitter from '@adonisjs/core/services/emitter'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import Setting from '#models/setting'
import { setPublicOrigins } from '#services/public_origins'

export type SiteSettings = {
  siteName: string
  tagline: string
  defaultLocale: string
  timezone: string
  siteBaseUrl: string
  publicOrigins: string[]
  contactEmail: string
  phone: string
  addressLine1: string
  city: string
  state: string
  zip: string
  emailFromName: string
  emailFromAddress: string
  logoAssetId: number | null
  faviconAssetId: number | null
  homePageId: number | null
  headScripts: string
}

export const DEFAULT_SETTINGS: SiteSettings = {
  siteName: 'LibrePublish',
  tagline: '',
  defaultLocale: 'en',
  timezone: '',
  siteBaseUrl: '',
  publicOrigins: [],
  contactEmail: '',
  phone: '',
  addressLine1: '',
  city: '',
  state: '',
  zip: '',
  emailFromName: '',
  emailFromAddress: '',
  logoAssetId: null,
  faviconAssetId: null,
  homePageId: null,
  headScripts: '',
}

export const SITE_FACING_GENERAL: (keyof SiteSettings)[] = [
  'siteName',
  'tagline',
  'siteBaseUrl',
  'defaultLocale',
  'phone',
  'contactEmail',
  'addressLine1',
  'city',
  'state',
  'zip',
]

declare module '@adonisjs/core/types' {
  interface EventsList {
    'cms:site_settings_changed': { fields: (keyof SiteSettings)[] }
  }
}

const CACHE_TTL = 10_000

let cached: { settings: SiteSettings; at: number } | null = null
let queue: Promise<unknown> = Promise.resolve()

export const SERVER_TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone

export function isTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat('en', { timeZone: value })
    return true
  } catch {
    return false
  }
}

export function siteTimeZone(settings: Pick<SiteSettings, 'timezone'>) {
  return settings.timezone && isTimeZone(settings.timezone) ? settings.timezone : SERVER_TIME_ZONE
}

export function originOf(url: string | null | undefined) {
  const value = (url ?? '').trim()
  if (!value) return null
  try {
    const parsed = new URL(value)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    return parsed.origin
  } catch {
    return null
  }
}

function publish(settings: SiteSettings) {
  const configured = [settings.siteBaseUrl, ...settings.publicOrigins]
    .map(originOf)
    .filter((origin): origin is string => !!origin)
  setPublicOrigins(configured)
}

export function forgetSettings() {
  cached = null
}

export async function getSettings(): Promise<SiteSettings> {
  if (cached && Date.now() - cached.at < CACHE_TTL) return cached.settings
  const rows = await Setting.query().whereIn('key', Object.keys(DEFAULT_SETTINGS))
  const stored = Object.fromEntries(rows.map((row) => [row.key, row.value]))
  const settings = { ...DEFAULT_SETTINGS, ...stored } as SiteSettings
  cached = { settings, at: Date.now() }
  publish(settings)
  return settings
}

export function withSettingsLock<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task)
  queue = run.catch(() => {})
  return run
}

export async function changeSetting<T = any>(
  key: string,
  change: (current: T | null, row: Setting, trx: TransactionClientContract) => T | Promise<T>
) {
  return withSettingsLock(() =>
    db.transaction(async (trx) => {
      const existing = await Setting.query({ client: trx }).where('key', key).forUpdate().first()
      const row = existing ?? new Setting()
      row.useTransaction(trx)
      row.key = key
      const next = await change(existing ? (existing.value as T) : null, row, trx)
      row.value = next ?? null
      await row.save()
      forgetSettings()
      return row
    })
  )
}

export async function getSetting<T = any>(key: string): Promise<T | null> {
  const row = await Setting.findBy('key', key)
  return row ? (row.value as T) : null
}

export async function getSettingRow(key: string) {
  return Setting.findBy('key', key)
}

export async function replaceSetting<T>(key: string, value: T) {
  return changeSetting<T>(key, () => value)
}

export async function mergeSetting<T extends Record<string, unknown>>(
  key: string,
  values: Partial<T> | ((current: Partial<T>) => Partial<T>)
) {
  return changeSetting<Partial<T>>(key, (current) => {
    const base = current && typeof current === 'object' ? current : {}
    return { ...base, ...(typeof values === 'function' ? values(base) : values) }
  })
}

export async function updateSettings(values: Partial<SiteSettings>) {
  const entries = Object.entries(values).filter(
    ([key, value]) => key in DEFAULT_SETTINGS && value !== undefined
  )
  if (!entries.length) return getSettings()
  forgetSettings()
  const before = await getSettings()
  await withSettingsLock(() =>
    db.transaction(async (trx) => {
      for (const [key, value] of entries) {
        const row =
          (await Setting.query({ client: trx }).where('key', key).forUpdate().first()) ??
          new Setting()
        row.useTransaction(trx)
        row.key = key
        row.value = value
        await row.save()
      }
    })
  )
  forgetSettings()
  const after = await getSettings()
  const fields = SITE_FACING_GENERAL.filter(
    (key) => JSON.stringify(before[key] ?? null) !== JSON.stringify(after[key] ?? null)
  )
  if (fields.length) emitter.emit('cms:site_settings_changed', { fields }).catch(() => {})
  return after
}
