import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import type User from '#models/user'
import UserSession, { SESSION_SEEN_EVERY } from '#models/user_session'

const SESSION_KEY = 'user_session_id'

function clientOf(ctx: HttpContext) {
  return {
    userAgent: ctx.request.header('user-agent')?.slice(0, 512) ?? null,
    ipAddress: ctx.request.ip(),
  }
}

export function currentSessionId(ctx: HttpContext): number | null {
  const id = ctx.session.get(SESSION_KEY)
  return typeof id === 'number' ? id : null
}

export async function startSession(ctx: HttpContext, user: User) {
  await ctx.auth.use('web').login(user)
  const record = await UserSession.create({
    userId: user.id,
    ...clientOf(ctx),
    lastSeenAt: DateTime.now(),
  })
  ctx.session.put(SESSION_KEY, record.id)
  return record
}

export async function endSession(ctx: HttpContext) {
  const id = currentSessionId(ctx)
  if (id) await UserSession.query().where('id', id).delete()
  ctx.session.forget(SESSION_KEY)
  await ctx.auth.use('web').logout()
}

export async function confirmSession(ctx: HttpContext, user: User) {
  const id = currentSessionId(ctx)
  if (id === null) {
    const adopted = await UserSession.create({
      userId: user.id,
      ...clientOf(ctx),
      lastSeenAt: DateTime.now(),
    })
    ctx.session.put(SESSION_KEY, adopted.id)
    return true
  }
  const record = await UserSession.find(id)
  if (!record || record.userId !== user.id || record.isExpired()) {
    if (record) await record.delete()
    ctx.session.forget(SESSION_KEY)
    await ctx.auth.use('web').logout()
    return false
  }
  if (record.lastSeenAt <= DateTime.now().minus(SESSION_SEEN_EVERY)) {
    record.merge({ lastSeenAt: DateTime.now(), ...clientOf(ctx) })
    await record.save()
  }
  return true
}

export async function revokeOtherSessions(ctx: HttpContext, user: User) {
  const query = UserSession.query().where('user_id', user.id)
  const id = currentSessionId(ctx)
  if (id) query.whereNot('id', id)
  await query.delete()
}

export function describeUserAgent(agent: string | null) {
  if (!agent) return 'Unknown device'
  const browser =
    [
      ['Edge', /Edg\//],
      ['Opera', /OPR\//],
      ['Firefox', /Firefox\//],
      ['Chrome', /Chrome\//],
      ['Safari', /Safari\//],
    ].find(([, pattern]) => (pattern as RegExp).test(agent))?.[0] ?? null
  const system =
    [
      ['iPhone', /iPhone/],
      ['iPad', /iPad/],
      ['Android', /Android/],
      ['macOS', /Mac OS X/],
      ['Windows', /Windows/],
      ['Linux', /Linux/],
    ].find(([, pattern]) => (pattern as RegExp).test(agent))?.[0] ?? null
  if (browser && system) return `${browser} on ${system}`
  return (browser as string | null) ?? (system as string | null) ?? agent.slice(0, 60)
}
