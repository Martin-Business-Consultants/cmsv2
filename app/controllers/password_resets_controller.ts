import type { HttpContext } from '@adonisjs/core/http'
import limiter from '@adonisjs/limiter/services/main'
import User from '#models/user'
import UserSession from '#models/user_session'
import SendIdentityMailJob from '#jobs/send_identity_mail_job'
import { passwordResetRequestValidator, passwordResetValidator } from '#validators/auth'
import { userForToken } from '#services/identity_tokens'
import { audit } from '#services/audit'

const SENT =
  'If that address belongs to an account with a verified email, we sent it reset instructions'

export default class PasswordResetsController {
  async create({ inertia }: HttpContext) {
    return inertia.render('auth/forgot_password', {})
  }

  async store(ctx: HttpContext) {
    const { request, response, session } = ctx
    const { email } = await request.validateUsing(passwordResetRequestValidator)
    const throttle = limiter.use({ requests: 5, duration: '1 hour' })
    const attempt = await throttle.increment(`password_resets:create:${request.ip()}:${email}`)
    if (attempt.consumed > attempt.limit) {
      session.flash('error', 'Too many password-reset attempts. Try again later.')
      return response.redirect().toRoute('password_reset.create')
    }

    const user = await User.query().where('email', email).whereNotNull('verified_at').first()
    if (user) {
      await SendIdentityMailJob.dispatch({ userId: user.id, kind: 'password_reset' })
      await audit(ctx, 'user.password_reset_requested', user)
    }
    session.flash('success', SENT)
    return response.redirect().toRoute('session.create')
  }

  async edit({ inertia, params, session, response }: HttpContext) {
    const user = await userForToken(params.token, 'password_reset')
    if (!user) {
      session.flash('error', 'That password reset link is invalid or has expired')
      return response.redirect().toRoute('password_reset.create')
    }
    return inertia.render('auth/reset_password', { token: params.token, email: user.email })
  }

  async update(ctx: HttpContext) {
    const { request, response, params, session } = ctx
    const user = await userForToken(params.token, 'password_reset')
    if (!user) {
      session.flash('error', 'That password reset link is invalid or has expired')
      return response.redirect().toRoute('password_reset.create')
    }
    const { password } = await request.validateUsing(passwordResetValidator)
    user.password = password
    await user.save()
    await UserSession.query().where('user_id', user.id).delete()
    await audit(ctx, 'user.password_reset', user)

    session.flash('success', 'Your password was reset successfully. Please sign in.')
    return response.redirect().toRoute('session.create')
  }
}
