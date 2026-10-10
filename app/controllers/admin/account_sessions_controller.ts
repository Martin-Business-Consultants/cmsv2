import type { HttpContext } from '@adonisjs/core/http'
import UserSession from '#models/user_session'
import { audit } from '#services/audit'
import { currentSessionId, describeUserAgent, endSession } from '#services/user_sessions'

export default class AccountSessionsController {
  async destroy(ctx: HttpContext) {
    const { params, auth, session, response } = ctx
    const user = auth.use('web').user!
    const record = await UserSession.query()
      .where('id', params.id)
      .where('user_id', user.id)
      .firstOrFail()
    const metadata = { device: describeUserAgent(record.userAgent), ip: record.ipAddress }

    if (record.id === currentSessionId(ctx)) {
      await audit(ctx, 'session.destroyed', user, { ...metadata, current: true })
      await endSession(ctx)
      session.flash('success', "You've been signed out")
      return response.redirect().toRoute('session.create')
    }

    await record.delete()
    await audit(ctx, 'session.destroyed', user, metadata)
    session.flash('success', 'That session has been signed out')
    return response.redirect().back()
  }
}
