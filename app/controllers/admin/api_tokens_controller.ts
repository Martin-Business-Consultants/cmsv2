import type { HttpContext } from '@adonisjs/core/http'
import ApiToken from '#models/api_token'
import { audit } from '#services/audit'
import { groupedCapabilities } from '#services/tokens'

function baseUrl({ request }: HttpContext) {
  return `${request.protocol()}://${request.host()}`
}

export default class ApiTokensController {
  async show(ctx: HttpContext) {
    const { auth, inertia } = ctx
    const user = auth.use('web').getUserOrFail()
    await user.load('role')
    const token = await ApiToken.for(user)

    return inertia.render('admin/settings/api_token', {
      token: {
        prefix: token.prefix,
        masked: token.masked,
        visible: token.visible,
        createdAt: token.createdAt.toISO(),
        lastUsedAt: token.lastUsedAt?.toISO() ?? null,
        lastUsedIp: token.lastUsedIp,
      },
      capabilities: groupedCapabilities(user.role),
      baseUrl: baseUrl(ctx),
    })
  }

  async reveal(ctx: HttpContext) {
    const { auth, response } = ctx
    const user = auth.use('web').getUserOrFail()
    const token = await ApiToken.for(user)
    const plaintext = token.readableToken
    if (!plaintext) return response.status(410).json({ error: 'rotation_required' })
    await audit(ctx, 'api_token.revealed', token, { prefix: token.prefix })
    return { token: plaintext }
  }

  async rotate(ctx: HttpContext) {
    const { auth, response, session } = ctx
    const user = auth.use('web').getUserOrFail()
    const token = await ApiToken.for(user)
    await token.rotate()
    await audit(ctx, 'api_token.rotated', token, { prefix: token.prefix })
    session.flash(
      'success',
      'Token rotated. The previous one stopped working immediately — update anything that was using it.'
    )
    return response.redirect().toRoute('admin.api_tokens.show')
  }
}
