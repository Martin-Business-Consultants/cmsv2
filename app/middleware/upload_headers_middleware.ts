import { extname } from 'node:path'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

const SANDBOXED = new Set(['.svg', '.svgz'])
const DOWNLOADED = new Set(['.html', '.htm', '.xhtml', '.xml', '.js', '.mjs'])

export default class UploadHeadersMiddleware {
  async handle({ request, response }: HttpContext, next: NextFn) {
    const path = request.url()
    if (!path.startsWith('/uploads/')) return next()
    const ext = extname(path).toLowerCase()
    response.header('X-Content-Type-Options', 'nosniff')
    if (SANDBOXED.has(ext) || DOWNLOADED.has(ext)) {
      response.header(
        'Content-Security-Policy',
        "default-src 'none'; img-src data:; style-src 'unsafe-inline'; sandbox"
      )
    }
    if (DOWNLOADED.has(ext)) response.header('Content-Disposition', 'attachment')
    return next()
  }
}
