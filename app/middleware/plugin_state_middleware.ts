import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { loadPluginState } from '#services/plugin_setup'

export default class PluginStateMiddleware {
  async handle(_ctx: HttpContext, next: NextFn) {
    await loadPluginState()
    return next()
  }
}
