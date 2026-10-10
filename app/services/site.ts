import { DateTime } from 'luxon'
import env from '#start/env'
import Page from '#models/page'
import Entry from '#models/entry'
import Collection from '#models/collection'
import Global from '#models/global'
import Redirect from '#models/redirect'
import { renderRichText } from '#services/rich_text'
import { ContentResolver } from '#services/content'
import { getSettings, type SiteSettings } from '#services/settings'
import { liveTranslations, siteLocales, splitLocalePath } from '#services/locales'
import { localizePath } from '#services/locale_paths'
import { taxonomyFor, type TaxonomyTerm } from '#services/taxonomy'
import type { Field, JsonLdNode, Seo } from '#types/content'
import type { RenderBlock, ResolvedAsset, SiteContext, SiteSeo } from '#types/site'

export type SitePageProps = {
  page: { id: number; title: string; path: string; locale: string }
  blocks: RenderBlock[]
  seo: SiteSeo
  site: SiteContext
  preview: boolean
}

export type SiteEntryProps = {
  entry: {
    id: number
    title: string
    slug: string
    path: string | null
    publishedAt: string | null
    data: Record<string, any>
    body: { html: string } | null
    blocks: RenderBlock[]
    locale: string
    category: TaxonomyTerm | null
    tags: TaxonomyTerm[]
  }
  collection: {
    slug: string
    name: string
    singularName: string
    urlPrefix: string | null
    fields: Field[]
  }
  seo: SiteSeo
  site: SiteContext
  preview: boolean
}

export type Resolved = { kind: 'page'; page: Page } | { kind: 'entry'; entry: Entry } | null

export function siteUrl() {
  return env.get('APP_URL').replace(/\/+$/, '')
}

export function normalizePath(path: string) {
  let decoded = path
  try {
    decoded = decodeURIComponent(path)
  } catch {}
  return decoded.replace(/^\/+|\/+$/g, '').toLowerCase()
}

export function pagePath(page: Page, settings: SiteSettings) {
  if (settings.homePageId ? page.id === settings.homePageId : page.path === 'home') {
    return localizePath('/', page.locale)
  }
  return localizePath(`/${page.path}`, page.locale)
}

async function localizedSeo(kind: 'page' | 'entry', record: Page | Entry, seo: SiteSeo) {
  const links = await liveTranslations(kind, [record])
  const translations = links.get(record.id) ?? []
  const base = siteUrl()
  const alternates = translations.length
    ? [
        { locale: record.locale, href: seo.canonical },
        ...translations.map((link) => ({ locale: link.locale, href: `${base}${link.path}` })),
      ]
    : []
  return { ...seo, lang: record.locale, alternates }
}

export async function matchRedirect(path: string) {
  const redirects = await Redirect.query().where('is_active', true)
  const trimmed = path.length > 1 ? path.replace(/\/+$/, '') : path
  const exact = redirects.find(
    (redirect) => !redirect.source.endsWith('/*') && [path, trimmed].includes(redirect.source)
  )
  let match: Redirect | undefined = exact
  let splat = ''
  if (!match) {
    const wildcards = redirects
      .filter((redirect) => redirect.source.endsWith('/*'))
      .sort((a, b) => b.source.length - a.source.length)
    for (const redirect of wildcards) {
      const prefix = redirect.source.slice(0, -2)
      if (trimmed === prefix || path.startsWith(`${prefix}/`)) {
        match = redirect
        splat = path.slice(prefix.length + 1)
        break
      }
    }
  }
  if (!match) return null
  match.hits = (match.hits ?? 0) + 1
  match.lastHitAt = DateTime.now()
  await match.save()
  return {
    destination: match.destination.replace(':splat', splat),
    statusCode: [301, 302, 307, 308].includes(match.statusCode) ? match.statusCode : 301,
  }
}

async function resolveHome(settings: SiteSettings, locale: string, defaultLocale: string) {
  const live = () => Page.query().withScopes((scopes) => scopes.live())
  if (locale === defaultLocale) {
    const home = settings.homePageId ? await live().where('id', settings.homePageId).first() : null
    return home ?? (await live().where('path', 'home').where('locale', locale).first())
  }
  const chosen = settings.homePageId ? await Page.find(settings.homePageId) : null
  const translated = chosen?.translationGroupId
    ? await live()
        .where('translation_group_id', chosen.translationGroupId)
        .where('locale', locale)
        .first()
    : null
  return translated ?? (await live().where('path', 'home').where('locale', locale).first())
}

async function resolveLocalized(
  normalized: string,
  locale: string,
  settings: SiteSettings,
  defaultLocale: string
): Promise<Resolved> {
  if (!normalized) {
    const page = await resolveHome(settings, locale, defaultLocale)
    return page ? { kind: 'page', page } : null
  }

  const page = await Page.query()
    .withScopes((scopes) => scopes.live())
    .where('path', normalized)
    .where('locale', locale)
    .first()
  if (page) return { kind: 'page', page }

  const segments = normalized.split('/')
  if (segments.length < 2) return null
  const slug = segments.pop()!
  const collection = await Collection.findBy('url_prefix', segments.join('/'))
  if (!collection) return null
  const entry = await Entry.query()
    .withScopes((scopes) => scopes.live())
    .where('collection_id', collection.id)
    .where('slug', slug)
    .where('locale', locale)
    .first()
  if (!entry) return null
  entry.$setRelated('collection', collection)
  return { kind: 'entry', entry }
}

export async function resolvePath(path: string, settings: SiteSettings): Promise<Resolved> {
  const normalized = normalizePath(path)
  const site = await siteLocales()
  const split = splitLocalePath(normalized, site)
  const found = await resolveLocalized(split.path, split.locale, settings, site.defaultLocale)
  if (found || !split.prefixed) return found
  return resolveLocalized(normalized, site.defaultLocale, settings, site.defaultLocale)
}

export async function siteContext(settings: SiteSettings, live = true): Promise<SiteContext> {
  const resolver = new ContentResolver({ live })
  const globals: Record<string, Record<string, any>> = {}
  for (const global of await Global.query().whereNull('deleted_at').orderBy('slug')) {
    globals[global.slug] = await new ContentResolver({ live }).data(global.fields, global.data)
  }
  return {
    name: settings.siteName,
    tagline: settings.tagline,
    logo: await resolver.asset(settings.logoAssetId),
    favicon: await resolver.asset(settings.faviconAssetId),
    url: siteUrl(),
    globals,
  }
}

async function buildSeo(options: {
  seo: Seo
  title: string
  path: string
  settings: SiteSettings
  fallbackImage?: ResolvedAsset | null
}): Promise<SiteSeo> {
  const { seo, settings, path } = options
  const name = settings.siteName
  const defaultTitle =
    path === '/'
      ? [name, settings.tagline].filter(Boolean).join(' — ')
      : `${options.title} · ${name}`
  const title = seo?.title || defaultTitle
  const description = seo?.description || (path === '/' ? settings.tagline || null : null)
  const image = (await new ContentResolver().asset(seo?.imageId)) ?? options.fallbackImage ?? null
  const canonical = seo?.canonicalUrl || `${siteUrl()}${path}`
  return {
    title,
    description,
    image,
    noindex: !!seo?.noindex,
    nofollow: !!seo?.nofollow,
    canonical,
    ogTitle: seo?.ogTitle || null,
    ogDescription: seo?.ogDescription || null,
    ogType: seo?.ogType || null,
    twitterCard: seo?.twitterCard || null,
    jsonLd: structuredData(seo, {
      name: seo?.title || options.title,
      description,
      url: canonical,
      image: image?.url ? absoluteAsset(image.url) : null,
    }),
  }
}

function absoluteAsset(url: string) {
  return url.startsWith('http') ? url : `${siteUrl()}${url}`
}

function structuredData(
  seo: Seo,
  facts: { name: string; description: string | null; url: string; image: string | null }
): JsonLdNode[] {
  const context = { '@context': 'https://schema.org' }
  if (seo?.jsonLd) {
    const nodes = Array.isArray(seo.jsonLd) ? seo.jsonLd : [seo.jsonLd]
    return nodes.map((node) => ({ ...context, ...node }))
  }
  const type = seo?.schemaType || 'WebPage'
  const article = ['Article', 'BlogPosting', 'NewsArticle'].includes(type)
  return [
    Object.fromEntries(
      Object.entries({
        ...context,
        '@type': type,
        [article ? 'headline' : 'name']: facts.name,
        'description': facts.description,
        'url': facts.url,
        'image': facts.image,
      }).filter(([, value]) => value !== null && value !== undefined)
    ),
  ]
}

function firstImage(fields: Field[], data: Record<string, any>): ResolvedAsset | null {
  for (const field of fields) {
    const value = data[field.name]
    if (field.type === 'asset' && value?.url && value.mimeType?.startsWith('image/')) return value
  }
  return null
}

export async function pageProps(page: Page, options: { live: boolean }): Promise<SitePageProps> {
  const settings = await getSettings()
  await siteLocales()
  const path = pagePath(page, settings)
  return {
    page: { id: page.id, title: page.title, path, locale: page.locale },
    blocks: await new ContentResolver({ live: options.live }).blocks(page.blocks ?? []),
    seo: await localizedSeo(
      'page',
      page,
      await buildSeo({ seo: page.seo, title: page.title, path, settings })
    ),
    site: await siteContext(settings, options.live),
    preview: !options.live,
  }
}

export async function entryProps(
  entry: Entry,
  options: { live: boolean }
): Promise<SiteEntryProps> {
  const settings = await getSettings()
  const collection = entry.collection
  const fields = collection.fields ?? []
  const resolver = new ContentResolver({ live: options.live })
  const data = await resolver.data(fields, entry.data ?? {})
  const blocks = collection.enableBlocks ? await resolver.blocks(entry.blocks ?? []) : []
  const bodyHtml = collection.enableBody && entry.body ? renderRichText(entry.body) : ''
  await siteLocales()
  const path = entry.publicPath
  const taxonomy = await taxonomyFor('entry', entry)
  return {
    entry: {
      id: entry.id,
      title: entry.title,
      slug: entry.slug,
      path,
      publishedAt: entry.publishedAt?.toISO() ?? null,
      data,
      body: bodyHtml ? { html: bodyHtml } : null,
      blocks,
      locale: entry.locale,
      category: taxonomy.category,
      tags: taxonomy.tags,
    },
    collection: {
      slug: collection.slug,
      name: collection.name,
      singularName: collection.singularName,
      urlPrefix: collection.urlPrefix,
      fields,
    },
    seo: await localizedSeo(
      'entry',
      entry,
      await buildSeo({
        seo: entry.seo,
        title: entry.title,
        path: path ?? `/${entry.slug}`,
        settings,
        fallbackImage: firstImage(fields, data),
      })
    ),
    site: await siteContext(settings, options.live),
    preview: !options.live,
  }
}

export async function notFoundProps() {
  const settings = await getSettings()
  return {
    site: await siteContext(settings),
    seo: {
      title: `Page not found · ${settings.siteName}`,
      description: null,
      image: null,
      noindex: true,
      canonical: siteUrl(),
    } satisfies SiteSeo,
  }
}

export type SitemapUrl = {
  loc: string
  lastmod: string | null
  alternates: { locale: string; href: string }[]
}

export async function sitemapEntries() {
  const settings = await getSettings()
  await siteLocales()
  const base = siteUrl()
  const urls: SitemapUrl[] = []
  const lastmod = (value: DateTime | null) => value?.toISODate() ?? null
  const withSelf = (
    locale: string,
    loc: string,
    links: { locale: string; path: string }[] | undefined
  ) =>
    links?.length
      ? [
          { locale, href: loc },
          ...links.map((link) => ({ locale: link.locale, href: `${base}${link.path}` })),
        ]
      : []

  const pages = await Page.query()
    .withScopes((scopes) => scopes.live())
    .orderBy('path')
  const pageLinks = await liveTranslations('page', pages)
  for (const page of pages) {
    if (page.seo?.noindex) continue
    const loc = `${base}${pagePath(page, settings)}`
    urls.push({
      loc,
      lastmod: lastmod(page.updatedAt ?? page.publishedAt),
      alternates: withSelf(page.locale, loc, pageLinks.get(page.id)),
    })
  }

  const collections = await Collection.query().whereNotNull('url_prefix').whereNot('url_prefix', '')
  for (const collection of collections) {
    const entries = await Entry.query()
      .withScopes((scopes) => scopes.live())
      .where('collection_id', collection.id)
      .orderBy('published_at', 'desc')
    entries.forEach((entry) => entry.$setRelated('collection', collection))
    const entryLinks = await liveTranslations('entry', entries)
    for (const entry of entries) {
      if (entry.seo?.noindex) continue
      const loc = `${base}${entry.publicPath}`
      urls.push({
        loc,
        lastmod: lastmod(entry.updatedAt ?? entry.publishedAt),
        alternates: withSelf(entry.locale, loc, entryLinks.get(entry.id)),
      })
    }
  }
  urls.sort((a, b) => (a.loc === `${base}/` ? -1 : b.loc === `${base}/` ? 1 : 0))
  return urls
}
