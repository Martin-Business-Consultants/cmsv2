export const WILDCARD = 'manage:all'

export const CAPABILITIES = {
  'Pages': ['pages:read', 'pages:write', 'pages:delete', 'pages:publish'],
  'Collections': ['collections:read', 'collections:write', 'collections:delete'],
  'Entries': ['entries:read', 'entries:write', 'entries:delete', 'entries:publish'],
  'Block types': ['block_types:read', 'block_types:write', 'block_types:delete'],
  'Globals': ['globals:read', 'globals:write', 'globals:publish', 'globals:delete'],
  'Media': ['assets:read', 'assets:write', 'assets:delete'],
  'Webhooks': ['webhooks:read', 'webhooks:write', 'webhooks:delete'],
  'Redirects': ['redirects:read', 'redirects:write', 'redirects:delete'],
  'Users': ['users:read', 'users:write', 'users:delete'],
  'Roles': ['roles:read', 'roles:write', 'roles:delete'],
  'Settings': ['settings:read', 'settings:write'],
  'Audit log': ['audit_log:read'],
  'Trash': ['trash:read', 'trash:write'],
  'Tools': ['tools:use'],
} as const

export type Capability = (typeof CAPABILITIES)[keyof typeof CAPABILITIES][number]

export const ALL_CAPABILITIES = Object.values(CAPABILITIES).flat() as Capability[]

export type BuiltInRoleKey = 'editor' | 'author' | 'site' | 'agent'

export const SITE_ROLE_NAME = 'Production site'

export const DEFAULT_ROLES: {
  key: BuiltInRoleKey
  name: string
  description: string
  permissions: string[]
}[] = [
  {
    key: 'editor',
    name: 'Editor',
    description: 'Writes and publishes content.',
    permissions: [
      'pages:read',
      'pages:write',
      'pages:publish',
      'collections:read',
      'entries:read',
      'entries:write',
      'entries:publish',
      'block_types:read',
      'globals:read',
      'globals:write',
      'globals:publish',
      'assets:read',
      'assets:write',
      'webhooks:read',
      'redirects:read',
      'settings:read',
      'audit_log:read',
      'trash:read',
      'trash:write',
    ],
  },
  {
    key: 'author',
    name: 'Author',
    description: 'Writes drafts for an editor to publish.',
    permissions: [
      'pages:read',
      'pages:write',
      'collections:read',
      'entries:read',
      'entries:write',
      'block_types:read',
      'globals:read',
      'assets:read',
      'assets:write',
      'settings:read',
    ],
  },
  {
    key: 'site',
    name: SITE_ROLE_NAME,
    description: 'A published site: reads content and nothing else.',
    permissions: [
      'pages:read',
      'collections:read',
      'entries:read',
      'block_types:read',
      'globals:read',
      'assets:read',
      'redirects:read',
    ],
  },
  {
    key: 'agent',
    name: 'Agent',
    description: 'An agent or script: writes drafts, never publishes them.',
    permissions: [
      'pages:read',
      'pages:write',
      'collections:read',
      'entries:read',
      'entries:write',
      'block_types:read',
      'globals:read',
      'globals:write',
      'assets:read',
      'assets:write',
      'redirects:read',
      'settings:read',
    ],
  },
]

const LEGACY_ROLE_NAMES: Record<string, string> = { Site: SITE_ROLE_NAME }

export function builtInRoleName(keyOrName: string) {
  const byKey = DEFAULT_ROLES.find((role) => role.key === keyOrName)
  return byKey?.name ?? LEGACY_ROLE_NAMES[keyOrName] ?? keyOrName
}
