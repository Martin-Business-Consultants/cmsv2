import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import {
  PUBLIC,
  authenticateApi,
  capabilityFor,
  controllerOf,
  wrapInEnvelope,
  type ManagementControllerClass,
} from '#services/management'
import { forbidden, renderApiError, unauthorized } from '#services/api_errors'

export default class ManagementApiMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    let controller: ManagementControllerClass | null = null
    let action: string | null = null
    try {
      const resolved = await controllerOf(ctx)
      controller = resolved?.controller ?? null
      action = resolved?.action ?? null
      const caller = await authenticateApi(ctx)
      if (!caller) unauthorized()
      const capability = controller && action ? capabilityFor(controller, action) : null
      if (capability === null) forbidden('(undeclared)')
      if (capability !== PUBLIC && !caller.can(capability)) forbidden(capability)
      await next()
    } catch (error) {
      return renderApiError(error, ctx)
    }
    wrapInEnvelope(ctx, controller, action)
  }
}
