import type { HttpContext } from '@adonisjs/core/http'
import limiter from '@adonisjs/limiter/services/main'
import User from '#models/user'
import { loginValidator } from '#validators/user'
import { challengeValidator } from '#validators/auth'
import { audit } from '#services/audit'
import { endSession, startSession } from '#services/user_sessions'
import { CODE_DIGITS } from '#services/two_factor'

const PENDING_KEY = 'pending_second_factor'
const PENDING_SECONDS = 5 * 60

type Pending = { userId: number; at: number }

function pendingOf(ctx: HttpContext): Pending | null {
  const pending = ctx.session.get(PENDING_KEY) as Pending | undefined
  if (!pending || typeof pending.userId !== 'number') return null
  if (Date.now() / 1000 - pending.at > PENDING_SECONDS) return null
  return pending
}

async function finishSignIn(ctx: HttpContext, user: User, secondFactor?: string) {
  ctx.session.forget(PENDING_KEY)
  const returnTo = ctx.session.pull('auth.returnTo')
  await startSession(ctx, user)
  await audit(ctx, 'session.created', user, secondFactor ? { secondFactor } : {})
  ctx.session.flash('success', 'Signed in successfully')
  const safe = typeof returnTo === 'string' && /^\/(?![/\\])/.test(returnTo)
  return ctx.response.redirect().toPath(safe ? returnTo : '/admin')
}

export default class SessionController {
  async create({ inertia, response }: HttpContext) {
    if (!(await User.query().first())) return response.redirect().toRoute('signup.create')
    return inertia.render('auth/login', {})
  }

  async store(ctx: HttpContext) {
    const { request, response, session } = ctx
    const { email, password } = await request.validateUsing(loginValidator)
    const throttle = limiter.use({ requests: 10, duration: '1 minute' })
    const key = `sessions:create:${request.ip()}:${email.trim().toLowerCase()}`
    const attempt = await throttle.increment(key)
    if (attempt.consumed > attempt.limit) {
      session.flash('error', 'Too many sign-in attempts. Try again in a minute.')
      session.flashOnly(['email'])
      return response.redirect().toRoute('session.create')
    }

    let user: User
    try {
      user = await User.verifyCredentials(email, password)
    } catch {
      await audit(ctx, 'session.failed', null, { email: email.slice(0, 120) })
      session.flash('error', 'That email or password is incorrect')
      session.flashOnly(['email'])
      return response.redirect().toRoute('session.create')
    }

    if (user.totpEnabled) {
      session.put(PENDING_KEY, { userId: user.id, at: Math.floor(Date.now() / 1000) })
      return response.redirect().toRoute('session.challenge')
    }
    return finishSignIn(ctx, user)
  }

  async challenge(ctx: HttpContext) {
    if (!pendingOf(ctx)) return ctx.response.redirect().toRoute('session.create')
    return ctx.inertia.render('auth/challenge', {})
  }

  async verify(ctx: HttpContext) {
    const { request, response, session } = ctx
    const pending = pendingOf(ctx)
    const user = pending ? await User.find(pending.userId) : null
    if (!pending || !user || !user.totpEnabled) {
      session.forget(PENDING_KEY)
      session.flash('error', 'Sign-in expired. Try again.')
      return response.redirect().toRoute('session.create')
    }

    const throttle = limiter.use({ requests: 10, duration: '5 minutes' })
    const attempt = await throttle.increment(`sessions:verify:${request.ip()}:${user.id}`)
    if (attempt.consumed > attempt.limit) {
      session.forget(PENDING_KEY)
      session.flash('error', 'Too many code attempts. Sign in again to start over.')
      return response.redirect().toRoute('session.create')
    }

    const { code } = await request.validateUsing(challengeValidator)
    const compact = code.replace(/\s+/g, '')
    if (compact.length === CODE_DIGITS && user.verifyTotp(compact)) {
      return finishSignIn(ctx, user, 'totp')
    }
    if (await user.consumeRecoveryCode(compact)) {
      return finishSignIn(ctx, user, 'recovery_code')
    }

    await audit(ctx, 'session.second_factor_failed', user)
    session.flash('error', 'That code is not valid')
    return response.redirect().toRoute('session.challenge')
  }

  async cancel({ session, response }: HttpContext) {
    session.forget(PENDING_KEY)
    return response.redirect().toRoute('session.create')
  }

  async destroy(ctx: HttpContext) {
    const user = ctx.auth.use('web').user
    if (user) await audit(ctx, 'session.destroyed', user, { current: true })
    await endSession(ctx)
    ctx.session.flash('success', "You've been signed out")
    return ctx.response.redirect().toRoute('session.create')
  }
}
