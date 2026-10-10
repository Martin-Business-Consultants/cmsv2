import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { plugins } from '#services/plugins'

export default class PluginEnabledMiddleware {
  async handle(ctx: HttpContext, next: NextFn, options: { plugin: string }) {
    if (!plugins.isEnabled(options.plugin)) return ctx.response.notFound()
    return next()
  }
}
