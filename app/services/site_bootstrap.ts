import { randomBytes } from 'node:crypto'
import Role from '#models/role'
import User from '#models/user'
import Global from '#models/global'
import Page from '#models/page'
import { DEFAULT_ROLES, WILDCARD } from '#types/permissions'
import { installStarterPack } from '#services/block_types'
import { settlePlugins } from '#services/plugin_setup'
import { getSettings, updateSettings } from '#services/settings'
import { snapshot } from '#services/pages'

export async function installRoles() {
  const admin = await Role.updateOrCreate(
    { name: 'Admin' },
    {
      name: 'Admin',
      description: 'Full access. A system role that cannot be edited.',
      permissions: [WILDCARD],
      isSystem: true,
    }
  )
  for (const { name, description, permissions } of DEFAULT_ROLES) {
    await Role.firstOrCreate({ name }, { name, description, permissions, isSystem: false })
  }
  return admin
}

export async function installBlockTypes() {
  await installStarterPack()
}

export async function installStarterGlobals() {
  if (await Global.query().where('slug', 'navigation').first()) return
  await Global.create({
    slug: 'navigation',
    name: 'Navigation',
    description: 'The links in the site header and footer.',
    icon: 'menu',
    fields: [
      {
        name: 'header',
        label: 'Header links',
        type: 'repeater',
        of: [{ name: 'link', label: 'Link', type: 'link', required: true }],
      },
      { name: 'footer_text', label: 'Footer text', type: 'text' },
    ],
    data: { header: [{ link: { kind: 'url', value: '/', label: 'Home' } }], footer_text: '' },
  })
}

export async function installHomePage(siteName: string) {
  if (await Page.query().where('slug', 'home').whereNull('parent_id').first()) return
  const page = await Page.create({
    title: siteName,
    slug: 'home',
    path: 'home',
    status: 'draft',
    seo: {},
    blocks: [
      {
        id: randomBytes(4).toString('hex'),
        type: 'hero',
        data: {
          heading: siteName,
          subheading: 'Replace this with one line that tells visitors what you do.',
        },
      },
    ],
  })
  await snapshot(page)
}

export async function bootstrapSite(siteName?: string | null) {
  const admin = await installRoles()
  await installBlockTypes()
  const settings = await getSettings()
  const name = siteName?.trim() || settings.siteName
  if (siteName?.trim()) await updateSettings({ siteName: name })
  await installStarterGlobals()
  await installHomePage(name)
  await settlePlugins()
  return admin
}

export function generatePassword() {
  return randomBytes(18).toString('base64url')
}

export async function firstAdmin() {
  const admins = await Role.query().where('is_system', true).select('id')
  return User.query()
    .whereIn(
      'role_id',
      admins.map((role) => role.id)
    )
    .orderBy('id')
    .first()
}
