import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import SendIdentityMailJob from '#jobs/send_identity_mail_job'
import { userForToken } from '#services/identity_tokens'
import { audit } from '#services/audit'

export default class EmailVerificationsController {
  async show(ctx: HttpContext) {
    const { params, session, response, auth } = ctx
    const signedIn = await auth.use('web').check()
    const user = await userForToken(params.token, 'email_verification')
    if (!user) {
      session.flash('error', 'That email verification link is invalid or has expired')
      return signedIn
        ? response.redirect().toPath('/admin/account#email')
        : response.redirect().toRoute('session.create')
    }
    if (!user.verifiedAt) {
      user.verifiedAt = DateTime.now()
      await user.save()
      await audit(ctx, 'user.email_verified', user, { email: user.email })
    }
    session.flash('success', 'Thank you for verifying your email address')
    return signedIn
      ? response.redirect().toPath('/admin/account')
      : response.redirect().toRoute('session.create')
  }

  async store({ auth, session, response }: HttpContext) {
    const user = auth.use('web').user!
    if (user.verifiedAt) {
      session.flash('success', 'Your email address is already verified')
      return response.redirect().back()
    }
    await SendIdentityMailJob.dispatch({ userId: user.id, kind: 'email_verification' })
    session.flash('success', 'We sent a verification email to your email address')
    return response.redirect().back()
  }
}
