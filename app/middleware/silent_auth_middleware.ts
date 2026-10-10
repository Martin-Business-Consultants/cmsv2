import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { confirmSession } from '#services/user_sessions'

export default class SilentAuthMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const web = ctx.auth.use('web')
    if ((await web.check()) && (await confirmSession(ctx, web.user!))) {
      await web.user!.load('role')
    }

    return next()
  }
}
