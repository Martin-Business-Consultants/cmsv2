import type { HttpContext } from '@adonisjs/core/http'
import DeviceAuthorization from '#models/device_authorization'
import { audit } from '#services/audit'

export const RETURN_TO_KEY = 'auth.returnTo'

function signedInUser(ctx: HttpContext) {
  const user = ctx.auth.use('web').user
  if (user) return user
  ctx.session.put(RETURN_TO_KEY, ctx.request.url(true))
  return null
}

export default class ConnectController {
  async show(ctx: HttpContext) {
    const { request, inertia, response } = ctx
    const user = signedInUser(ctx)
    if (!user) return response.redirect().toRoute('session.create')
    const code = String(request.qs().code ?? '').trim()
    const authorization = code ? await DeviceAuthorization.findByUserCode(code) : null
    const pending = authorization?.pending ? authorization : null

    return inertia.render('auth/connect', {
      code,
      authorization: pending
        ? {
            userCode: pending.userCode,
            purpose: pending.site ? ('site' as const) : ('user' as const),
            hostname: pending.hostname,
            label: pending.label,
            approvable: pending.approvableBy(user),
          }
        : null,
      userName: user.displayName,
    })
  }

  async store(ctx: HttpContext) {
    const { request, response, session } = ctx
    const user = signedInUser(ctx)
    if (!user) return response.redirect().toRoute('session.create')
    const authorization = await DeviceAuthorization.findByUserCode(request.input('code'))

    if (!authorization || authorization.expired) {
      session.flash('error', "That code has expired or doesn't exist. Run `cms login` again.")
      return response.redirect().toRoute('connect.show')
    }

    if (request.input('decision') === 'deny') {
      await authorization.deny()
      await audit(ctx, 'device_authorization.denied', authorization, {
        purpose: authorization.purpose,
        hostname: authorization.hostname,
      })
      session.flash('success', 'Denied. Nothing was connected.')
    } else if (!authorization.approvableBy(user)) {
      session.flash(
        'error',
        "Connecting a site issues a service token, which your role can't do. Ask someone who manages settings."
      )
    } else {
      await authorization.approve(user)
      await audit(ctx, 'device_authorization.approved', authorization, {
        purpose: authorization.purpose,
        hostname: authorization.hostname,
      })
      session.flash(
        'success',
        authorization.site
          ? `Connected — ${authorization.label || 'the site'} has a read-only token of its own.`
          : `Connected — ${authorization.hostname || 'that machine'} can now act as you.`
      )
    }
    return response.redirect().toRoute('connect.show')
  }
}
