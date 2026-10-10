import type { HttpContext } from '@adonisjs/core/http'
import { errors } from '@vinejs/vine'
import Page from '#models/page'
import Entry from '#models/entry'
import TranslationGroup, { type TranslationKind } from '#models/translation_group'
import { getSettingRow, getSettings, replaceSetting } from '#services/settings'
import { applyLiveScope } from '#services/publishing'
import { localizePath, rememberDefaultLocale } from '#services/locale_paths'
import { badRequest } from '#services/delivery'

export { defaultLocaleSync, localizePath } from '#services/locale_paths'

export function sitePathOf(record: Page | Entry, homePageId: number | null) {
  if (record instanceof Page && homePageId && record.id === homePageId) {
    return localizePath('/', record.locale)
  }
  return record.publicPath
}

export const LOCALES_SETTING = 'locales'

export const LOCALE_PATTERN = /^[a-z]{2,3}(-[a-z0-9]{2,8})*$/

export type SiteLocales = { defaultLocale: string; locales: string[] }

export type TranslationLink = {
  id: number
  locale: string
  title: string
  status: string
  isLive: boolean
  publicPath: string | null
}

let cached: { extra: string[]; at: number } | null = null
const CACHE_TTL = 10_000

export function normalizeLocale(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/_/g, '-')
}

export function isLocale(value: string) {
  return LOCALE_PATTERN.test(value)
}

async function extraLocales() {
  if (cached && Date.now() - cached.at < CACHE_TTL) return cached.extra
  const row = await getSettingRow(LOCALES_SETTING)
  const value = Array.isArray(row?.value) ? (row.value as unknown[]) : []
  const extra = value.map(normalizeLocale).filter(isLocale)
  cached = { extra, at: Date.now() }
  return extra
}

export async function siteLocales(): Promise<SiteLocales> {
  const settings = await getSettings()
  const defaultLocale = normalizeLocale(settings.defaultLocale) || 'en'
  rememberDefaultLocale(defaultLocale)
  const locales = [...new Set([defaultLocale, ...(await extraLocales())])]
  return { defaultLocale, locales }
}

export async function saveLocales(locales: string[]) {
  const { defaultLocale } = await siteLocales()
  const extra = [...new Set(locales.map(normalizeLocale).filter(isLocale))].filter(
    (locale) => locale !== defaultLocale
  )
  await replaceSetting(LOCALES_SETTING, extra)
  cached = null
  return siteLocales()
}

export function splitLocalePath(normalized: string, site: SiteLocales) {
  const [first, ...rest] = normalized.split('/')
  if (first && first !== site.defaultLocale && site.locales.includes(first)) {
    return { locale: first, path: rest.join('/'), prefixed: true }
  }
  return { locale: site.defaultLocale, path: normalized, prefixed: false }
}

export async function assertLocaleEnabled(locale: string, field = 'locale') {
  const site = await siteLocales()
  if (!site.locales.includes(locale)) {
    throw new errors.E_VALIDATION_ERROR([
      {
        field,
        message: `"${locale}" isn't one of the site's languages (${site.locales.join(', ')})`,
        rule: 'locale',
      },
    ])
  }
  return site
}

export async function localeCounts() {
  const count = async (model: typeof Page | typeof Entry) => {
    const rows = await model
      .query()
      .whereNull('deleted_at')
      .select('locale')
      .count('* as total')
      .groupBy('locale')
    return Object.fromEntries(rows.map((row) => [row.locale, Number(row.$extras.total)]))
  }
  const [pages, entries] = await Promise.all([count(Page), count(Entry)])
  return { pages, entries }
}

export async function listLocaleFilter(
  qs: Record<string, unknown>,
  scope: () => ReturnType<typeof Page.query> | ReturnType<typeof Entry.query>
) {
  const site = await siteLocales()
  const rows = (await scope().distinct('locale').orderBy('locale')) as { locale: string }[]
  const used = rows.map((row) => row.locale).filter(Boolean)
  const locales = [...new Set([...site.locales, ...used])]
  const requested = normalizeLocale(qs.locale)
  const locale = locales.includes(requested) ? requested : ''
  return { locale, locales, defaultLocale: site.defaultLocale }
}

async function members(kind: TranslationKind, groupId: number) {
  if (kind === 'page') {
    return Page.query().where('translation_group_id', groupId).whereNull('deleted_at')
  }
  return Entry.query()
    .where('translation_group_id', groupId)
    .whereNull('deleted_at')
    .preload('collection')
}

export async function translationsOf(
  kind: TranslationKind,
  record: Page | Entry
): Promise<TranslationLink[]> {
  if (!record.translationGroupId) return []
  await siteLocales()
  const { homePageId } = await getSettings()
  const siblings = await members(kind, record.translationGroupId)
  return siblings
    .filter((sibling) => sibling.id !== record.id)
    .sort((a, b) => a.locale.localeCompare(b.locale))
    .map((sibling) => ({
      id: sibling.id,
      locale: sibling.locale,
      title: sibling.title,
      status: sibling.status,
      isLive: sibling.isLive,
      publicPath: sitePathOf(sibling, homePageId),
    }))
}

export async function liveTranslations(
  kind: TranslationKind,
  records: (Page | Entry)[]
): Promise<Map<number, { locale: string; path: string }[]>> {
  const out = new Map<number, { locale: string; path: string }[]>()
  const groupIds = [
    ...new Set(records.map((record) => record.translationGroupId).filter(Boolean)),
  ] as number[]
  for (const record of records) out.set(record.id, [])
  if (!groupIds.length) return out
  await siteLocales()
  const { homePageId } = await getSettings()
  const query =
    kind === 'page'
      ? Page.query().whereIn('translation_group_id', groupIds)
      : Entry.query().whereIn('translation_group_id', groupIds).preload('collection')
  applyLiveScope(query)
  const siblings: (Page | Entry)[] = await query
  for (const record of records) {
    if (!record.translationGroupId) continue
    out.set(
      record.id,
      siblings
        .filter(
          (sibling) =>
            sibling.translationGroupId === record.translationGroupId && sibling.id !== record.id
        )
        .map((sibling) => ({ locale: sibling.locale, path: sitePathOf(sibling, homePageId) ?? '' }))
        .filter((link) => link.path)
        .sort((a, b) => a.locale.localeCompare(b.locale))
    )
  }
  return out
}

export async function ensureTranslationGroup(kind: TranslationKind, record: Page | Entry) {
  if (record.translationGroupId) return record.translationGroupId
  const group = await TranslationGroup.create({ kind })
  record.translationGroupId = group.id
  await record.save()
  return group.id
}

export async function assertTranslationFree(
  kind: TranslationKind,
  record: Page | Entry,
  locale: string
) {
  if (locale === record.locale) {
    throw new errors.E_VALIDATION_ERROR([
      { field: 'locale', message: `This ${kind} is already in "${locale}"`, rule: 'locale' },
    ])
  }
  if (!record.translationGroupId) return
  const siblings = await members(kind, record.translationGroupId)
  const taken = siblings.find((sibling) => sibling.locale === locale)
  if (taken) {
    throw new errors.E_VALIDATION_ERROR([
      {
        field: 'locale',
        message: `“${taken.title}” is already the "${locale}" translation`,
        rule: 'locale',
      },
    ])
  }
}

export async function assertLocaleFreeInGroup(
  kind: TranslationKind,
  record: Page | Entry,
  locale: string
) {
  if (!record.translationGroupId || locale === record.$original.locale) return
  const siblings = await members(kind, record.translationGroupId)
  const taken = siblings.find((sibling) => sibling.id !== record.id && sibling.locale === locale)
  if (taken) {
    throw new errors.E_VALIDATION_ERROR([
      {
        field: 'locale',
        message: `Another translation (“${taken.title}”) is already in "${locale}"`,
        rule: 'locale',
      },
    ])
  }
}

export async function localeEditorProps(kind: TranslationKind, record?: Page | Entry) {
  const site = await siteLocales()
  return {
    locales: site,
    translations: record ? await translationsOf(kind, record) : [],
  }
}

export async function localeParam(ctx: HttpContext) {
  const raw = ctx.request.qs().locale
  if (raw === undefined || raw === '') return null
  const locale = normalizeLocale(raw)
  if (!isLocale(locale)) {
    badRequest('"locale" must be a language code such as en or fr-ca')
  }
  return locale
}
