import type { HttpContext } from '@adonisjs/core/http'
import { brandingCss, brandingEtag } from '#services/branding'

export default class BrandingStylesheetsController {
  async show({ request, response }: HttpContext) {
    const etag = await brandingEtag()
    response.header('Content-Type', 'text/css; charset=utf-8')
    response.header('Cache-Control', 'public, max-age=0, must-revalidate')
    response.header('ETag', etag)
    if (request.header('if-none-match') === etag) return response.status(304).send('')
    return response.send((await brandingCss()) || '\n')
  }
}
