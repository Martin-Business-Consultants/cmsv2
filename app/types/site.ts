import type { JsonLdNode } from '#types/content'

export type ResolvedAsset = {
  id: number
  url: string
  alt: string
  width: number | null
  height: number | null
  srcset: string
  mimeType: string
  caption?: string | null
  focalPoint?: { x: number; y: number }
}

export type ResolvedRichText = {
  html: string
  doc: Record<string, any>
}

export type ResolvedLink = {
  href: string
  label: string | null
  kind: 'url' | 'page' | 'entry'
}

export type ResolvedEntry = {
  id: number
  title: string
  slug: string
  url: string | null
  collection: string
  publishedAt: string | null
  data: Record<string, any>
  status?: string
  updatedAt?: string | null
  category?: { id: number; slug: string; title: string } | null
  tags?: { id: number; slug: string; title: string }[]
}

export type RenderBlock = {
  id: string
  type: string
  data: Record<string, any>
}

export type SiteNavItem = { label: string; href: string }

export type SiteContext = {
  name: string
  tagline: string
  logo: ResolvedAsset | null
  favicon: ResolvedAsset | null
  url: string
  globals: Record<string, Record<string, any>>
}

export type SiteSeo = {
  title: string
  description: string | null
  image: ResolvedAsset | null
  noindex: boolean
  canonical: string
  nofollow?: boolean
  ogTitle?: string | null
  ogDescription?: string | null
  ogType?: string | null
  twitterCard?: string | null
  jsonLd?: JsonLdNode[]
  lang?: string
  alternates?: { locale: string; href: string }[]
}
