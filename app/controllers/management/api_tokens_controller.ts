import type { HttpContext } from '@adonisjs/core/http'
import {
  PUBLIC,
  callerOf,
  crumb,
  type AgentBreadcrumbs,
  type AgentSummaries,
  type Authorization,
} from '#services/management'
import { serializeTokenSummary } from '#services/management_tokens'
import { audit } from '#services/audit'

function sessionAuth(ctx: HttpContext) {
  return ctx.response.status(400).json({ error: 'session_auth' })
}

export default class ApiTokensController {
  static capabilities: Authorization = { me: PUBLIC, rotate: PUBLIC }

  static agentSummary: AgentSummaries = {
    me: (payload) => {
      const who = payload.user?.name || payload.user?.email || payload.service?.name || 'unknown'
      const kind = payload.user ? 'person' : 'service token'
      const caps: string[] = Array.isArray(payload.capabilities) ? payload.capabilities : []
      const writes = caps.some((capability) => capability.endsWith(':write'))
        ? 'can write'
        : 'read-only'
      return `${who} (${kind}) · ${caps.length} capabilities · ${writes}.`
    },
  }

  static agentBreadcrumbs: AgentBreadcrumbs = {
    me: () => [
      crumb('Can this machine actually work?', 'cms doctor'),
      crumb('The shape of this CMS', 'cms manifest'),
    ],
  }

  async me(ctx: HttpContext) {
    const caller = callerOf(ctx)
    const token = caller.token
    if (!token) return sessionAuth(ctx)
    const service = caller.service
    return {
      token: serializeTokenSummary(token),
      capabilities: caller.capabilities,
      ...(service
        ? { service: { id: service.id, name: service.name, role: service.role?.name ?? null } }
        : {
            user: {
              id: caller.user!.id,
              name: caller.user!.fullName,
              email: caller.user!.email,
            },
          }),
    }
  }

  async rotate(ctx: HttpContext) {
    const caller = callerOf(ctx)
    const token = caller.token
    if (!token) return sessionAuth(ctx)
    const plaintext = await token.rotate()
    if (caller.service) {
      await audit(ctx, 'service_token.rotated', caller.service, { name: caller.service.name })
    } else {
      await audit(ctx, 'api_token.rotated', token, { prefix: token.prefix })
    }
    return { token: serializeTokenSummary(token), plaintext }
  }
}
