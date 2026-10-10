import type { HttpContext } from '@adonisjs/core/http'
import limiter from '@adonisjs/limiter/services/main'
import User from '#models/user'
import SendIdentityMailJob from '#jobs/send_identity_mail_job'
import { signupValidator } from '#validators/auth'
import { audit } from '#services/audit'
import { bootstrapSite } from '#services/site_bootstrap'
import { getSettings } from '#services/settings'
import { startSession } from '#services/user_sessions'

async function refuseWhenInstalled({ session, response }: HttpContext) {
  if (!(await User.query().first())) return null
  session.flash('error', 'This CMS is invitation-only. Ask an administrator to add you.')
  return response.redirect().toRoute('session.create')
}

export default class RegistrationsController {
  async create(ctx: HttpContext) {
    const refused = await refuseWhenInstalled(ctx)
    if (refused) return refused
    const { siteName } = await getSettings()
    return ctx.inertia.render('auth/signup', { siteName })
  }

  async store(ctx: HttpContext) {
    const { request, response, session } = ctx
    const refused = await refuseWhenInstalled(ctx)
    if (refused) return refused

    const throttle = limiter.use({ requests: 5, duration: '1 hour' })
    const attempt = await throttle.increment(`registrations:create:${request.ip()}`)
    if (attempt.consumed > attempt.limit) {
      session.flash('error', 'Too many sign-up attempts. Try again later.')
      return response.redirect().toRoute('signup.create')
    }

    const values = await request.validateUsing(signupValidator)
    const admin = await bootstrapSite(values.siteName)
    const user = await User.create({
      fullName: values.fullName,
      email: values.email,
      password: values.password,
      roleId: admin.id,
      verifiedAt: null,
    })
    await startSession(ctx, user)
    await audit(ctx, 'user.signed_up', user, { role: admin.name })
    await audit(ctx, 'session.created', user)
    await SendIdentityMailJob.dispatch({ userId: user.id, kind: 'email_verification' })

    session.flash('success', 'Welcome! You have signed up successfully')
    return response.redirect().toPath('/admin')
  }
}
