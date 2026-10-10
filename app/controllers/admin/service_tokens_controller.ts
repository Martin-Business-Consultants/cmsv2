import type { HttpContext } from '@adonisjs/core/http'
import Role from '#models/role'
import ServiceToken from '#models/service_token'
import { serviceTokenValidator } from '#validators/service_token'
import { issueServiceToken } from '#services/management_tokens'
import { audit } from '#services/audit'
import { SITE_ROLE_NAME } from '#types/permissions'

function serialize(token: ServiceToken) {
  return {
    id: token.id,
    name: token.name,
    description: token.description,
    roleName: token.role?.name ?? null,
    prefix: token.prefix,
    masked: token.masked,
    visible: token.visible,
    revoked: token.revoked,
    createdBy: token.createdBy?.email ?? null,
    createdAt: token.createdAt.toISO(),
    lastUsedAt: token.lastUsedAt?.toISO() ?? null,
    lastUsedIp: token.lastUsedIp,
    revokedAt: token.revokedAt?.toISO() ?? null,
    capabilities: token.capabilities,
  }
}

function findOrFail(id: unknown) {
  return ServiceToken.query()
    .where('id', Number(id) || 0)
    .preload('role')
    .preload('createdBy')
    .firstOrFail()
}

export default class ServiceTokensController {
  async index({ inertia, bouncer, auth }: HttpContext) {
    await bouncer.authorize('access', 'settings:read')
    const tokens = await ServiceToken.query()
      .apply((scopes) => scopes.ordered())
      .preload('role')
      .preload('createdBy')
    const roles = await Role.query().orderBy('name')
    const site = roles.find((role) => role.name === SITE_ROLE_NAME)

    return inertia.render('admin/settings/service_tokens', {
      live: tokens.filter((token) => !token.revoked).map(serialize),
      revoked: tokens.filter((token) => token.revoked).map(serialize),
      roles: roles.map((role) => ({ id: role.id, name: role.name, description: role.description })),
      defaultRoleId: site?.id ?? null,
      canManage: auth.use('web').user!.can('settings:write'),
    })
  }

  async store(ctx: HttpContext) {
    const { request, response, bouncer, session, auth } = ctx
    await bouncer.authorize('access', 'settings:write')
    const values = await request.validateUsing(serviceTokenValidator)
    const role = await Role.findOrFail(values.roleId)
    const token = await issueServiceToken(ctx, {
      name: values.name,
      description: values.description ?? null,
      role,
      createdBy: auth.use('web').user!,
    })
    session.flash(
      'success',
      `Issued “${token.name}”. Reveal it to copy the secret — then store it where it’s used.`
    )
    session.flash('issuedTokenId', token.id)
    return response.redirect().toRoute('admin.service_tokens.index')
  }

  async reveal(ctx: HttpContext) {
    const { params, response, bouncer } = ctx
    await bouncer.authorize('access', 'settings:write')
    const token = await findOrFail(params.id)
    const plaintext = token.readableToken
    if (!plaintext) return response.status(410).json({ error: 'rotation_required' })
    await audit(ctx, 'service_token.revealed', token, { name: token.name })
    return { token: plaintext }
  }

  async rotate(ctx: HttpContext) {
    const { params, response, bouncer, session } = ctx
    await bouncer.authorize('access', 'settings:write')
    const token = await findOrFail(params.id)
    if (token.revoked) {
      session.flash('error', `“${token.name}” is revoked. Issue a new token instead.`)
      return response.redirect().toRoute('admin.service_tokens.index')
    }
    await token.rotate()
    await audit(ctx, 'service_token.rotated', token, { name: token.name })
    session.flash(
      'success',
      `Rotated “${token.name}”. The previous secret stopped working immediately — update wherever it was stored.`
    )
    return response.redirect().toRoute('admin.service_tokens.index')
  }

  async revoke(ctx: HttpContext) {
    const { params, response, bouncer, session } = ctx
    await bouncer.authorize('access', 'settings:write')
    const token = await findOrFail(params.id)
    await token.revoke()
    await audit(ctx, 'service_token.revoked', token, { name: token.name })
    session.flash('success', `Revoked “${token.name}”.`)
    return response.redirect().toRoute('admin.service_tokens.index')
  }
}
