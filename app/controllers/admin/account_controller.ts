import type { HttpContext } from '@adonisjs/core/http'
import hash from '@adonisjs/core/services/hash'
import { errors } from '@vinejs/vine'
import Role from '#models/role'
import User from '#models/user'
import UserSession from '#models/user_session'
import SendIdentityMailJob from '#jobs/send_identity_mail_job'
import {
  confirmPasswordValidator,
  emailValidator,
  passwordValidator,
  profileValidator,
} from '#validators/account'
import { audit } from '#services/audit'
import { getSettings } from '#services/settings'
import { provisioningUri, qrCodeSvg } from '#services/two_factor'
import {
  currentSessionId,
  describeUserAgent,
  endSession,
  revokeOtherSessions,
} from '#services/user_sessions'

function fail(field: string, message: string): never {
  throw new errors.E_VALIDATION_ERROR([{ field, message, rule: 'password' }])
}

async function assertPassword(user: User, password: string, field = 'currentPassword') {
  if (!(await hash.verify(user.password, password))) {
    fail(field, 'Your current password is incorrect')
  }
}

async function isLastAdmin(user: User) {
  if (!user.role?.isAdmin) return false
  const roles = await Role.all()
  const admins = roles.filter((role) => role.isAdmin).map((role) => role.id)
  const result = await User.query().whereIn('role_id', admins).count('* as total')
  return Number(result[0].$extras.total) <= 1
}

export default class AccountController {
  async edit(ctx: HttpContext) {
    const { inertia, auth, session } = ctx
    const user = auth.use('web').user!
    await user.ensureTotpSecret()
    const sessions = await UserSession.query()
      .where('user_id', user.id)
      .orderBy('created_at', 'desc')
    const current = currentSessionId(ctx)
    const { siteName } = await getSettings()
    const uri =
      !user.totpEnabled && user.totpSecret
        ? provisioningUri(user.totpSecret, user.email, siteName || 'LibrePublish')
        : null
    const recoveryCodes = session.flashMessages.get('recoveryCodes') as string[] | undefined

    return inertia.render('admin/account', {
      account: {
        fullName: user.fullName ?? '',
        email: user.email,
        roleName: user.role?.name ?? null,
        verified: user.isVerified,
        createdAt: user.createdAt.toISO()!,
        lastAdmin: await isLastAdmin(user),
      },
      twoFactor: {
        enabled: user.totpEnabled,
        enabledAt: user.totpEnabledAt?.toISO() ?? null,
        recoveryCodesLeft: user.recoveryCodesLeft,
        secret: uri ? user.totpSecret : null,
        uri,
        qrCode: uri ? await qrCodeSvg(uri) : null,
      },
      recoveryCodes: Array.isArray(recoveryCodes) ? recoveryCodes : null,
      sessions: sessions.map((record) => ({
        id: record.id,
        device: describeUserAgent(record.userAgent),
        userAgent: record.userAgent,
        ipAddress: record.ipAddress,
        createdAt: record.createdAt.toISO()!,
        lastSeenAt: record.lastSeenAt.toISO()!,
        current: record.id === current,
      })),
    })
  }

  async update(ctx: HttpContext) {
    const { request, response, auth, session } = ctx
    const user = auth.use('web').user!
    const { fullName } = await request.validateUsing(profileValidator)
    const changed = user.fullName !== fullName
    user.fullName = fullName
    await user.save()
    if (changed) await audit(ctx, 'user.account_updated', user, { fields: ['fullName'] })
    session.flash('success', 'Your profile has been updated')
    return response.redirect().back()
  }

  async updateEmail(ctx: HttpContext) {
    const { request, response, auth, session } = ctx
    const user = auth.use('web').user!
    const values = await request.validateUsing(emailValidator, { meta: { userId: user.id } })
    await assertPassword(user, values.currentPassword)
    if (values.email === user.email) {
      session.flash('success', 'Your email is unchanged')
      return response.redirect().back()
    }

    const previous = user.email
    user.merge({ email: values.email, verifiedAt: null })
    await user.save()
    await audit(ctx, 'user.email_changed', user, { from: previous, to: user.email })
    await SendIdentityMailJob.dispatch({ userId: user.id, kind: 'email_verification' })
    session.flash('success', 'Your email has been changed. Check your inbox to verify it.')
    return response.redirect().back()
  }

  async updatePassword(ctx: HttpContext) {
    const { request, response, auth, session } = ctx
    const user = auth.use('web').user!
    const values = await request.validateUsing(passwordValidator)
    await assertPassword(user, values.currentPassword)

    user.password = values.password
    await user.save()
    await revokeOtherSessions(ctx, user)
    await audit(ctx, 'user.password_changed', user)
    session.flash('success', 'Your password has been changed. Other sessions were signed out.')
    return response.redirect().back()
  }

  async destroy(ctx: HttpContext) {
    const { request, response, auth, session } = ctx
    const user = auth.use('web').user!
    const { currentPassword } = await request.validateUsing(confirmPasswordValidator)
    await assertPassword(user, currentPassword)
    if (await isLastAdmin(user)) {
      fail('currentPassword', "You're the last admin. Make someone else an admin first.")
    }

    await audit(ctx, 'user.account_deleted', user, { email: user.email })
    await endSession(ctx)
    await user.delete()
    session.flash('success', 'Your account has been deleted')
    return response.redirect().toRoute('session.create')
  }
}
