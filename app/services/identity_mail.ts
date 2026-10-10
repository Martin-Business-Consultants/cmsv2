import env from '#start/env'
import mail from '@adonisjs/mail/services/main'
import User from '#models/user'
import IdentityMessage from '#mails/identity_message'
import { getSettings } from '#services/settings'
import { tokenFor } from '#services/identity_tokens'

export type IdentityMailKind = 'password_reset' | 'email_verification'

function escape(value: string) {
  return value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`)
}

function absolute(path: string) {
  return new URL(path, env.get('APP_URL')).toString()
}

export async function sendIdentityMail(userId: number, kind: IdentityMailKind) {
  const user = await User.findOrFail(userId)
  const { siteName } = await getSettings()
  const token = encodeURIComponent(tokenFor(user, kind))
  const email = escape(user.email)

  const message =
    kind === 'password_reset'
      ? new IdentityMessage({
          to: user.email,
          subject: 'Reset your password',
          siteName,
          intro: [
            `Can't remember your password for <strong>${email}</strong>? That's OK, it happens. Just hit the link below to set a new one.`,
          ],
          introText: [
            `Can't remember your password for ${user.email}? That's OK, it happens. Just follow the link below to set a new one.`,
          ],
          action: 'Reset my password',
          url: absolute(`/admin/password-reset/${token}`),
          outro:
            'If you did not request a password reset you can safely ignore this email, it expires in 20 minutes. Only someone with access to this email account can reset your password.',
        })
      : new IdentityMessage({
          to: user.email,
          subject: 'Verify your email',
          siteName,
          intro: [
            `This is to confirm that <strong>${email}</strong> is the email you want to use on your account. If you ever lose your password, that's where we'll email a reset link.`,
            '<strong>You must hit the link below to confirm that you received this email.</strong>',
          ],
          introText: [
            `This is to confirm that ${user.email} is the email you want to use on your account. If you ever lose your password, that's where we'll email a reset link.`,
            'You must follow the link below to confirm that you received this email.',
          ],
          action: 'Yes, use this email for my account',
          url: absolute(`/admin/email-verification/${token}`),
          outro: 'The link works for 2 days.',
        })

  await mail.send(message)
}
