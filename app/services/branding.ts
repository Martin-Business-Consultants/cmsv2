import type { DateTime } from 'luxon'
import {
  BRAND_BRIEF_FIELDS,
  FONTS,
  brandingStylesheet,
  googleFontUrl,
  isCustomized,
  normalizeBranding,
  type BrandBrief,
  type BrandBriefField,
  type BrandingValues,
} from '#types/branding'
import type { ResolvedAsset } from '#types/site'
import { plugins } from '#services/plugins'
import { getSettingRow, getSettings, replaceSetting } from '#services/settings'

export const BRANDING_KEY = 'branding'
export const BRAND_BRIEF_KEY = 'brand'

export type BrandingAssets = {
  siteName: string
  logoUrl: string | null
  logoSmallUrl: string | null
  faviconUrl: string | null
  faviconTouchUrl: string | null
  faviconType: string | null
}

type Snapshot = {
  branding: BrandingValues
  updatedAt: DateTime | null
  assets: BrandingAssets
  at: number
}

const CACHE_TTL = 10_000

let snapshot: Snapshot | null = null

export function forgetBranding() {
  snapshot = null
}

function variantUrl(asset: ResolvedAsset, width: number) {
  const variants = (asset.srcset || '')
    .split(',')
    .map((entry) => entry.trim().split(/\s+/))
    .map(([url, size]) => ({ url, width: Number.parseInt(size ?? '', 10) }))
    .filter((variant) => variant.url && Number.isFinite(variant.width))
    .sort((a, b) => a.width - b.width)
  const fit = variants.find((variant) => variant.width >= width)
  return fit?.url ?? asset.url
}

function versioned(url: string | null, version: string) {
  if (!url) return null
  return `${url}${url.includes('?') ? '&' : '?'}v=${version}`
}

async function resolveAssets(ids: number[]) {
  const media = plugins.provided('media')
  const wanted = ids.filter((id) => Number.isInteger(id) && id > 0)
  if (!media || !wanted.length) return new Map<number, ResolvedAsset>()
  try {
    return await media.resolve(wanted)
  } catch {
    return new Map<number, ResolvedAsset>()
  }
}

async function load(): Promise<Snapshot> {
  const [row, settings] = await Promise.all([getSettingRow(BRANDING_KEY), getSettings()])
  const assets = await resolveAssets(
    [settings.logoAssetId, settings.faviconAssetId].filter((id): id is number => !!id)
  )
  const logo = settings.logoAssetId ? (assets.get(settings.logoAssetId) ?? null) : null
  const favicon = settings.faviconAssetId ? (assets.get(settings.faviconAssetId) ?? null) : null
  const version = String(row?.updatedAt?.toMillis() ?? 0)
  const faviconSmall = favicon ? variantUrl(favicon, 64) : null
  return {
    branding: normalizeBranding(row?.value),
    updatedAt: row?.updatedAt ?? null,
    assets: {
      siteName: settings.siteName,
      logoUrl: versioned(logo?.url ?? null, version),
      logoSmallUrl: versioned(logo ? variantUrl(logo, 480) : null, version),
      faviconUrl: versioned(faviconSmall, version),
      faviconTouchUrl: versioned(favicon ? variantUrl(favicon, 180) : null, version),
      faviconType: favicon && faviconSmall === favicon.url ? favicon.mimeType : null,
    },
    at: Date.now(),
  }
}

async function current() {
  if (!snapshot || Date.now() - snapshot.at > CACHE_TTL) snapshot = await load()
  return snapshot
}

export async function getBranding() {
  const { branding } = await current()
  return branding
}

export async function brandingAssets() {
  const { assets } = await current()
  return assets
}

export async function brandingVersion() {
  const { updatedAt } = await current()
  return updatedAt ? String(updatedAt.toMillis()) : '0'
}

export async function brandingEtag() {
  return `"branding-${await brandingVersion()}-${Object.keys(FONTS).length}"`
}

export async function saveBranding(values: Partial<BrandingValues>) {
  const branding = normalizeBranding(values)
  const stored = Object.fromEntries(
    Object.entries(branding).filter(([, value]) => value !== null && value !== '')
  )
  await replaceSetting(BRANDING_KEY, stored)
  forgetBranding()
  return branding
}

export async function brandingCss() {
  return brandingStylesheet(await getBranding())
}

function escapeAttribute(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export async function brandingHead() {
  try {
    const { branding, assets } = await current()
    const tags: string[] = []
    if (isCustomized(branding)) {
      const font = googleFontUrl(branding.font)
      if (font) {
        tags.push('<link rel="preconnect" href="https://fonts.googleapis.com">')
        tags.push('<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>')
        tags.push(`<link rel="stylesheet" href="${escapeAttribute(font)}">`)
      }
      tags.push(
        `<link rel="stylesheet" href="/branding.css?v=${escapeAttribute(await brandingVersion())}" data-branding>`
      )
    }
    if (assets.faviconUrl) {
      const type = assets.faviconType ? ` type="${escapeAttribute(assets.faviconType)}"` : ''
      tags.push(`<link rel="icon" href="${escapeAttribute(assets.faviconUrl)}"${type}>`)
      tags.push(
        `<link rel="apple-touch-icon" sizes="180x180" href="${escapeAttribute(assets.faviconTouchUrl ?? assets.faviconUrl)}">`
      )
    }
    return tags.join('\n    ')
  } catch {
    return ''
  }
}

export async function getBrandBrief(): Promise<BrandBrief> {
  const row = await getSettingRow(BRAND_BRIEF_KEY)
  const data = (row?.value ?? {}) as Record<string, unknown>
  return Object.fromEntries(
    (Object.keys(BRAND_BRIEF_FIELDS) as BrandBriefField[]).map((field) => [
      field,
      typeof data[field] === 'string' ? (data[field] as string) : '',
    ])
  ) as BrandBrief
}

export async function brandBrief() {
  const brief = await getBrandBrief()
  return Object.fromEntries(
    Object.entries(brief)
      .map(([field, value]) => [field, value.trim()])
      .filter(([, value]) => value)
  ) as Partial<BrandBrief>
}

export async function saveBrandBrief(values: Partial<Record<BrandBriefField, string | null>>) {
  const brief = Object.fromEntries(
    (Object.keys(BRAND_BRIEF_FIELDS) as BrandBriefField[]).map((field) => [
      field,
      (values[field] ?? '').trim(),
    ])
  ) as BrandBrief
  await replaceSetting(BRAND_BRIEF_KEY, brief)
  return brief
}
