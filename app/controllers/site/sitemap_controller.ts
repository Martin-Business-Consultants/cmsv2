import type { HttpContext } from '@adonisjs/core/http'
import { sitemapEntries } from '#services/site'

const escape = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export default class SitemapController {
  async show({ response }: HttpContext) {
    const entries = await sitemapEntries()
    const urls = entries.map((url) =>
      [
        '  <url>',
        `    <loc>${escape(url.loc)}</loc>`,
        url.lastmod ? `    <lastmod>${url.lastmod}</lastmod>` : null,
        ...url.alternates.map(
          (link) =>
            `    <xhtml:link rel="alternate" hreflang="${escape(link.locale)}" href="${escape(link.href)}"/>`
        ),
        '  </url>',
      ]
        .filter(Boolean)
        .join('\n')
    )
    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
      ...urls,
      '</urlset>',
    ].join('\n')
    response.header('Content-Type', 'application/xml; charset=utf-8')
    return response.send(xml)
  }
}
