import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import limiter from '@adonisjs/limiter/services/main'
import { RETRY_AFTER_SECONDS, rateLimited } from '#services/api_errors'

export type ThrottleOptions = {
  scope: string
  requests: number
  by?: 'ip' | 'caller'
  shape?: 'api' | 'device'
}

export default class ApiThrottleMiddleware {
  async handle(ctx: HttpContext, next: NextFn, options: ThrottleOptions) {
    if (options.requests <= 0) return next()
    const token = options.by === 'caller' ? ctx.apiCaller?.token : null
    const who = token ? `${token.constructor.name}:${token.id}` : ctx.request.ip()
    const attempt = await limiter
      .use({ requests: options.requests, duration: '1 minute' })
      .increment(`${options.scope}:${who}`)
    if (attempt.consumed <= options.requests) return next()
    if (options.shape === 'device') {
      ctx.response.header('Retry-After', String(RETRY_AFTER_SECONDS))
      return ctx.response.status(429).json({ status: 'error', error: 'rate_limited' })
    }
    rateLimited()
  }
}
