import type { HttpContext } from '@adonisjs/core/http'
import Role from '#models/role'
import ServiceToken from '#models/service_token'
import { callerOf, type Authorization } from '#services/management'
import {
  findRole,
  issueServiceToken,
  loadServiceToken,
  serializeServiceToken,
} from '#services/management_tokens'
import { gone, notFound } from '#services/api_errors'
import { audit } from '#services/audit'

async function scoped(ctx: HttpContext) {
  const token = await loadServiceToken(ctx.params.id)
  if (!token) notFound(`Couldn't find ServiceToken with 'id'=${ctx.params.id}`)
  return token
}

export default class ServiceTokensController {
  static capabilities: Authorization = {
    index: 'settings:read',
    show: 'settings:read',
    store: 'settings:write',
    reveal: 'settings:write',
    rotate: 'settings:write',
    revoke: 'settings:write',
  }

  async index() {
    const [tokens, roles] = await Promise.all([
      ServiceToken.query()
        .apply((scopes) => scopes.ordered())
        .preload('role')
        .preload('createdBy'),
      Role.query().orderBy('name'),
    ])
    return {
      service_tokens: tokens.map(serializeServiceToken),
      roles: roles.map((role) => ({ id: role.id, name: role.name, description: role.description })),
    }
  }

  async show(ctx: HttpContext) {
    return { service_token: serializeServiceToken(await scoped(ctx)) }
  }

  async store(ctx: HttpContext) {
    const { request, response } = ctx
    const role = await findRole({ id: request.input('role_id'), name: request.input('role') })
    if (!role) {
      const roles = await Role.query().orderBy('name')
      const names = roles.map((entry) => entry.name)
      return response.status(422).json({
        error: 'role_required',
        message: `Pick a role for the token — one of: ${names.join(', ')}`,
      })
    }
    const token = await issueServiceToken(ctx, {
      name: request.input('name'),
      description: request.input('description'),
      role,
      createdBy: callerOf(ctx).user,
    })
    return response
      .status(201)
      .json({ service_token: serializeServiceToken(token), token: token.readableToken })
  }

  async reveal(ctx: HttpContext) {
    const token = await scoped(ctx)
    const plaintext = token.readableToken
    if (!plaintext) {
      gone(
        'rotation_required',
        'This token predates stored plaintext. Rotate it to get a readable secret.'
      )
    }
    await audit(ctx, 'service_token.revealed', token, { name: token.name })
    return { service_token: serializeServiceToken(token), token: plaintext }
  }

  async rotate(ctx: HttpContext) {
    const token = await scoped(ctx)
    const plaintext = await token.rotate()
    await audit(ctx, 'service_token.rotated', token, { name: token.name })
    return { service_token: serializeServiceToken(token), token: plaintext }
  }

  async revoke(ctx: HttpContext) {
    const token = await scoped(ctx)
    await token.revoke()
    await audit(ctx, 'service_token.revoked', token, { name: token.name })
    return { service_token: serializeServiceToken(token) }
  }
}
