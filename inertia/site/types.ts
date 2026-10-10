import type { Field } from '#types/content'
import type { RenderBlock, SiteContext, SiteSeo } from '#types/site'

export type SiteTerm = { id: number; slug: string; title: string }

export type SitePageProps = {
  page: { id: number; title: string; path: string; locale?: string }
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
    locale?: string
    category?: SiteTerm | null
    tags?: SiteTerm[]
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

export type SiteNotFoundProps = {
  seo: SiteSeo
  site: SiteContext
}

export type SiteShared = {
  site?: SiteContext
  preview?: boolean
}
