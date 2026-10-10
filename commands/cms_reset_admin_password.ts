import { BaseCommand, args } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { DateTime } from 'luxon'

export default class CmsResetAdminPassword extends BaseCommand {
  static commandName = 'cms:reset-admin-password'
  static description =
    'Give a user (the first admin by default) a new random password, mark their email verified and print the password.'
  static options: CommandOptions = { startApp: true }

  @args.string({ description: 'Email of the user to reset', required: false })
  declare email?: string

  async run() {
    const { default: User } = await import('#models/user')
    const { default: UserSession } = await import('#models/user_session')
    const { firstAdmin, generatePassword } = await import('#services/site_bootstrap')
    const { audit } = await import('#services/audit')
    const user = this.email
      ? await User.findBy('email', this.email.trim().toLowerCase())
      : await firstAdmin()
    if (!user) {
      const users = await User.query().orderBy('id').select('email')
      const emails = users.map((row) => row.email)
      this.logger.error(`No matching user. Users: ${emails.join(', ') || 'none'}`)
      this.exitCode = 1
      return
    }

    const password = generatePassword()
    user.password = password
    user.verifiedAt ??= DateTime.now()
    await user.save()
    await UserSession.query().where('user_id', user.id).delete()
    await audit({ via: 'cli' }, 'user.password_reset', user, { command: this.commandName })

    process.stderr.write(`Reset password for ${user.email}\n`)
    process.stdout.write(`${password}\n`)
  }
}
