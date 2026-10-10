import type { HttpContext } from '@adonisjs/core/http'
import { siteUrl } from '#services/site'

export default class RobotsController {
  async show({ response }: HttpContext) {
    response.header('Content-Type', 'text/plain; charset=utf-8')
    return response.send(
      [
        'User-agent: *',
        'Allow: /',
        'Disallow: /admin',
        '',
        `Sitemap: ${siteUrl()}/sitemap.xml`,
        '',
      ].join('\n')
    )
  }
}
