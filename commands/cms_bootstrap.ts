import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import env from '#start/env'
import { DateTime } from 'luxon'

export default class CmsBootstrap extends BaseCommand {
  static commandName = 'cms:bootstrap'
  static description =
    'Set up a new install once: roles, block types, starter content and an owner who can sign in. Safe to run twice. Prints JSON.'
  static options: CommandOptions = { startApp: true }

  @flags.string({ description: 'Owner email (default: CMS_OWNER_EMAIL or owner@<APP_URL host>)' })
  declare email?: string

  @flags.string({ description: 'Site name (default: CMS_SITE_NAME or the current site name)' })
  declare name?: string

  @flags.string({
    description: 'Owner full name (default: CMS_OWNER_NAME or the email local part)',
  })
  declare ownerName?: string

  async run() {
    const { default: User } = await import('#models/user')
    const { bootstrapSite, generatePassword } = await import('#services/site_bootstrap')
    const { getSettings } = await import('#services/settings')
    const { default: ApiToken } = await import('#models/api_token')
    const { default: ServiceToken } = await import('#models/service_token')
    const { default: Role } = await import('#models/role')
    const appUrl = env.get('APP_URL').replace(/\/+$/, '')
    const email = (this.email || process.env.CMS_OWNER_EMAIL || `owner@${new URL(appUrl).hostname}`)
      .trim()
      .toLowerCase()
    const admin = await bootstrapSite(this.name || process.env.CMS_SITE_NAME || null)

    let owner = await User.findBy('email', email)
    let password: string | null = null
    if (!owner) {
      password = generatePassword()
      owner = await User.create({
        fullName: this.ownerName || process.env.CMS_OWNER_NAME || email.split('@')[0],
        email,
        password,
        roleId: admin.id,
        verifiedAt: DateTime.now(),
      })
    }

    const ownerToken = await ApiToken.for(owner)
    const token = ownerToken.readableToken ?? (await ownerToken.rotate())
    const machineToken = async (roleName: string) => {
      const existing = await ServiceToken.query()
        .apply((scopes) => scopes.active())
        .where('name', roleName)
        .first()
      if (existing) return existing.readableToken ?? (await existing.rotate())
      const role = await Role.findByOrFail('name', roleName)
      const issued = await ServiceToken.issue({
        name: roleName,
        role,
        description: 'Issued at setup.',
      })
      return issued.readableToken
    }
    const productionToken = await machineToken('Production site')
    const userAgentToken = await machineToken('Agent')

    const { siteName } = await getSettings()
    process.stdout.write(
      `${JSON.stringify(
        {
          owner_email: owner.email,
          admin_password: password,
          token,
          production_token: productionToken,
          user_agent_token: userAgentToken,
          created: password !== null,
          site_name: siteName,
          cms_url: appUrl,
          sign_in_url: `${appUrl}/admin/login`,
        },
        null,
        2
      )}\n`
    )
  }
}
