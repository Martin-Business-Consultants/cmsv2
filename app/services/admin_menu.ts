import type User from '#models/user'
import Collection from '#models/collection'
import { plugins, type MenuGroup } from '#services/plugins'

export type AdminSubmenuLink = { label: string; href: string; icon?: string | null }

export type AdminMenuItem = {
  id: string
  label: string
  icon: string
  href: string
  submenu: AdminSubmenuLink[]
}

export type AdminMenuGroup = { label: string; items: AdminMenuItem[] }

export type AdminNewItem = { label: string; href: string }

type Link = { label: string; href: string; capability?: string; icon?: string | null }

type Item = {
  id: string
  label: string
  icon: string
  href?: string
  capability?: string
  submenu: Link[]
}

export type SettingsGroup =
  'Your account' | 'Workspace' | 'Integrations' | 'Plugins' | (string & {})

export type SettingsSection = Link & { description: string; group: SettingsGroup; inMenu?: boolean }

export const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    group: 'Your account',
    label: 'Account',
    href: '/admin/account',
    description: 'Your name, email, password, two-factor, sessions, and deleting your account.',
    inMenu: false,
  },
  {
    group: 'Workspace',
    label: 'General',
    href: '/admin/settings/general',
    capability: 'settings:read',
    description: 'Business name, contact details, public URL, time zone and email sender.',
  },
  {
    group: 'Workspace',
    label: 'Languages',
    href: '/admin/settings/languages',
    capability: 'settings:read',
    description: 'The languages your content is written in, and their URL prefixes.',
  },
  {
    group: 'Workspace',
    label: 'Branding',
    href: '/admin/settings/branding',
    description: 'Appearance, logo, favicon, colors, font, corners, and brand context.',
  },
  {
    group: 'Workspace',
    label: 'Plugins',
    href: '/admin/plugins',
    capability: 'settings:read',
    description: 'Turn plugins on and off, and see what each one adds.',
    inMenu: false,
  },
  {
    group: 'Your account',
    label: 'API token',
    href: '/admin/settings/api-token',
    description:
      'Your personal token for the API and the cms CLI: reveal, rotate, and what it can do.',
  },
  {
    group: 'Integrations',
    label: 'Service tokens',
    href: '/admin/settings/service-tokens',
    capability: 'settings:read',
    description:
      'Credentials for machines: a published site, a build, an agent. Each with its own role.',
  },
]

export type SettingsSectionGroup = {
  group: SettingsGroup
  sections: { label: string; href: string; description: string }[]
}

export function settingsSections(user: User): SettingsSectionGroup[] {
  const allowed = (capability?: string) => !capability || user.can(capability)
  const order: SettingsGroup[] = ['Your account', 'Workspace', 'Integrations', 'Plugins']
  const pluginPages = plugins.enabled(plugins.settingsPages).map((page) => ({
    group: 'Plugins' as SettingsGroup,
    label: page.label,
    href: page.href,
    capability: page.capability ?? 'settings:read',
    description: page.description ?? '',
  }))
  const groups = new Map<SettingsGroup, SettingsSectionGroup['sections']>()
  for (const section of [...SETTINGS_SECTIONS, ...pluginPages]) {
    if (!allowed(section.capability)) continue
    if (!groups.has(section.group)) groups.set(section.group, [])
    groups.get(section.group)!.push({
      label: section.label,
      href: section.href,
      description: section.description,
    })
  }
  return [...groups.entries()]
    .sort(([a], [b]) => {
      const rank = (group: SettingsGroup) => {
        const index = order.indexOf(group)
        return index === -1 ? order.length : index
      }
      return rank(a) - rank(b)
    })
    .map(([group, sections]) => ({ group, sections }))
}

function coreMenu(collections: Collection[]): [MenuGroup, Item[]][] {
  return [
    [
      'Content',
      [
        {
          id: 'pages',
          label: 'Pages',
          icon: 'file-text',
          capability: 'pages:read',
          submenu: [
            { label: 'All pages', href: '/admin/pages', capability: 'pages:read' },
            { label: 'Add new', href: '/admin/pages/new', capability: 'pages:write' },
          ],
        },
        {
          id: 'collections',
          label: 'Collections',
          icon: 'library',
          capability: 'collections:read',
          submenu: [
            {
              label: 'All collections',
              href: '/admin/collections',
              capability: 'collections:read',
            },
            { label: 'Add new', href: '/admin/collections/new', capability: 'collections:write' },
            ...collections.map((collection) => ({
              label: collection.name,
              href: `/admin/collections/${collection.id}/entries`,
              capability: 'entries:read',
              icon: collection.icon,
            })),
          ],
        },
        {
          id: 'globals',
          label: 'Globals',
          icon: 'globe',
          capability: 'globals:read',
          submenu: [
            { label: 'All globals', href: '/admin/globals', capability: 'globals:read' },
            { label: 'Add new', href: '/admin/globals/new', capability: 'globals:write' },
          ],
        },
      ],
    ],
    [
      'Insights',
      [
        {
          id: 'audit_log',
          label: 'Audit log',
          icon: 'history',
          href: '/admin/audit-log',
          capability: 'audit_log:read',
          submenu: [],
        },
        {
          id: 'trash',
          label: 'Trash',
          icon: 'trash-2',
          href: '/admin/trash',
          capability: 'trash:read',
          submenu: [],
        },
      ],
    ],
    [
      'Tools',
      [
        {
          id: 'tools',
          label: 'Tools',
          icon: 'wrench',
          submenu: [
            { label: 'Block types', href: '/admin/block-types', capability: 'block_types:read' },
            { label: 'Redirects', href: '/admin/redirects', capability: 'redirects:read' },
            { label: 'Webhooks', href: '/admin/webhooks', capability: 'webhooks:read' },
          ],
        },
        {
          id: 'plugins',
          label: 'Plugins',
          icon: 'package',
          href: '/admin/plugins',
          capability: 'settings:read',
          submenu: [],
        },
      ],
    ],
    [
      'Access',
      [
        {
          id: 'users',
          label: 'Users',
          icon: 'users',
          capability: 'users:read',
          submenu: [
            { label: 'All users', href: '/admin/users', capability: 'users:read' },
            { label: 'Add new', href: '/admin/users/new', capability: 'users:write' },
            { label: 'Profile', href: '/admin/account' },
          ],
        },
        {
          id: 'roles',
          label: 'Roles',
          icon: 'shield',
          capability: 'roles:read',
          submenu: [
            { label: 'All roles', href: '/admin/roles', capability: 'roles:read' },
            { label: 'Add new', href: '/admin/roles/new', capability: 'roles:write' },
          ],
        },
      ],
    ],
    [
      'Settings',
      [
        {
          id: 'settings',
          label: 'Settings',
          icon: 'settings',
          href: '/admin/settings',
          submenu: [
            { label: 'All settings', href: '/admin/settings' },
            ...SETTINGS_SECTIONS.filter((section) => section.inMenu !== false),
            ...plugins.enabled(plugins.settingsPages).map((page) => ({
              label: page.label,
              href: page.href,
              capability: page.capability ?? 'settings:read',
            })),
          ],
        },
      ],
    ],
  ]
}

function insertAfter<T>(list: T[], value: T, index: number) {
  if (index === -1) list.push(value)
  else list.splice(index + 1, 0, value)
}

export async function adminMenu(user: User) {
  const collections = user.can('entries:read')
    ? await Collection.query().orderBy('name').limit(12)
    : []
  const groups = coreMenu(collections)

  for (const addition of plugins.enabled(plugins.menus)) {
    let group = groups.find(([label]) => label === addition.group)
    if (!group) {
      group = [addition.group, []]
      groups.splice(groups.length - 1, 0, group)
    }
    const items = group[1]
    insertAfter(
      items,
      { ...addition, submenu: [] },
      items.findIndex((item) => item.id === addition.after)
    )
  }

  for (const addition of plugins.enabled(plugins.submenus)) {
    const parent = groups.flatMap(([, items]) => items).find((item) => item.id === addition.parent)
    if (!parent) continue
    insertAfter(
      parent.submenu,
      addition,
      parent.submenu.findIndex((link) => link.label === addition.after)
    )
  }

  const allowed = (capability?: string) => !capability || user.can(capability)

  const menu: AdminMenuGroup[] = groups
    .map(([label, items]) => ({
      label,
      items: items
        .filter((item) => allowed(item.capability))
        .map((item) => {
          const submenu = item.submenu
            .filter((link) => allowed(link.capability))
            .map(({ label: text, href, icon }) => ({ label: text, href, icon: icon ?? null }))
          return {
            id: item.id,
            label: item.label,
            icon: item.icon,
            href: item.href ?? submenu[0]?.href ?? '',
            submenu,
          }
        })
        .filter((item) => item.href),
    }))
    .filter((group) => group.items.length)

  const core: (Link & { after?: string })[] = [
    { label: 'Page', href: '/admin/pages?new=1', capability: 'pages:write' },
    { label: 'Collection', href: '/admin/collections?new=1', capability: 'collections:write' },
    { label: 'Global', href: '/admin/globals/new', capability: 'globals:write' },
    { label: 'Block type', href: '/admin/block-types/new', capability: 'block_types:write' },
    { label: 'User', href: '/admin/users/new', capability: 'users:write' },
    ...collections.map((collection) => ({
      label: `Entry in ${collection.name}`,
      href: `/admin/collections/${collection.id}/entries/new`,
      capability: 'entries:write',
    })),
  ]
  for (const addition of plugins.enabled(plugins.newItems)) {
    insertAfter(
      core,
      addition,
      core.findIndex((item) => item.label === addition.after)
    )
  }
  const newItems: AdminNewItem[] = core
    .filter((item) => allowed(item.capability))
    .map(({ label, href }) => ({ label, href }))

  return { menu, newItems }
}
