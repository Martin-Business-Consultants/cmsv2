import { useEffect } from 'react'
import { Head } from '@inertiajs/react'
import type { SiteContext, SiteSeo } from '#types/site'

function robotsFor(seo: SiteSeo) {
  const directives = [seo.noindex && 'noindex', seo.nofollow && 'nofollow'].filter(Boolean)
  return directives.length ? directives.join(', ') : null
}

function safeJson(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}

export default function SeoHead({
  seo,
  site,
  type = 'website',
}: {
  seo: SiteSeo
  site: SiteContext
  type?: string
}) {
  const image = seo.image?.url
    ? seo.image.url.startsWith('http')
      ? seo.image.url
      : `${site.url}${seo.image.url}`
    : null
  const robots = robotsFor(seo)
  const ogTitle = seo.ogTitle || seo.title
  const ogDescription = seo.ogDescription || seo.description
  const card = seo.twitterCard || (image ? 'summary_large_image' : 'summary')
  const jsonLd = seo.jsonLd ?? []
  const lang = seo.lang
  const alternates = seo.alternates ?? []

  useEffect(() => {
    if (lang) document.documentElement.lang = lang
  }, [lang])

  return (
    <Head>
      <title>{seo.title}</title>
      {seo.description && (
        <meta head-key="description" name="description" content={seo.description} />
      )}
      <link head-key="canonical" rel="canonical" href={seo.canonical} />
      {alternates.map((link) => (
        <link
          key={link.locale}
          head-key={`alternate-${link.locale}`}
          rel="alternate"
          hrefLang={link.locale}
          href={link.href}
        />
      ))}
      {robots && <meta head-key="robots" name="robots" content={robots} />}
      <meta head-key="og:type" property="og:type" content={seo.ogType || type} />
      <meta head-key="og:site_name" property="og:site_name" content={site.name} />
      <meta head-key="og:title" property="og:title" content={ogTitle} />
      {ogDescription && (
        <meta head-key="og:description" property="og:description" content={ogDescription} />
      )}
      <meta head-key="og:url" property="og:url" content={seo.canonical} />
      {image && <meta head-key="og:image" property="og:image" content={image} />}
      <meta head-key="twitter:card" name="twitter:card" content={card} />
      <meta head-key="twitter:title" name="twitter:title" content={ogTitle} />
      {ogDescription && (
        <meta head-key="twitter:description" name="twitter:description" content={ogDescription} />
      )}
      {image && <meta head-key="twitter:image" name="twitter:image" content={image} />}
      {jsonLd.length > 0 && (
        <script
          head-key="json-ld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJson(jsonLd.length === 1 ? jsonLd[0] : jsonLd) }}
        />
      )}
      {site.favicon?.url && (
        <link head-key="favicon" rel="icon" href={site.favicon.url} type={site.favicon.mimeType} />
      )}
    </Head>
  )
}
