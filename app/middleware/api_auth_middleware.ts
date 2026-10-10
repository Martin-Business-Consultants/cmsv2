import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { authenticateApi } from '#services/management'
import { unauthorized } from '#services/api_errors'

export default class ApiAuthMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    if (!(await authenticateApi(ctx))) unauthorized()
    return next()
  }
}
