import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import env from '#start/env'
import { forceHttps } from '#services/environment_checks'

const EXEMPT = new Set(['/up'])

export default class ForceHttpsMiddleware {
  enabled = forceHttps()

  async handle({ request, response }: HttpContext, next: NextFn) {
    if (!this.enabled || EXEMPT.has(request.url())) return next()
    const forwarded = request.header('x-forwarded-proto')?.split(',')[0]?.trim().toLowerCase()
    const secure = env.get('ASSUME_SSL') || forwarded === 'https' || request.protocol() === 'https'
    if (secure) return next()
    const target = new URL(request.url(true), env.get('APP_URL'))
    target.protocol = 'https:'
    const method = request.method()
    return response
      .redirect()
      .status(method === 'GET' || method === 'HEAD' ? 301 : 307)
      .toPath(target.toString())
  }
}
