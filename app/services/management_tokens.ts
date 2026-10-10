import type { HttpContext } from '@adonisjs/core/http'
import Role from '#models/role'
import type ApiToken from '#models/api_token'
import ServiceToken from '#models/service_token'
import type User from '#models/user'
import { audit } from '#services/audit'
import { iso } from '#services/management'
import { invalid } from '#services/api_errors'

export function serializeTokenSummary(token: ApiToken | ServiceToken) {
  return {
    id: token.id,
    prefix: token.prefix,
    created_at: iso(token.createdAt),
    last_used_at: iso(token.lastUsedAt),
    last_used_ip: token.lastUsedIp ?? null,
  }
}

export function serializeServiceToken(token: ServiceToken) {
  return {
    id: token.id,
    name: token.name,
    description: token.description ?? null,
    role: token.role?.name ?? null,
    prefix: token.prefix,
    masked: token.masked,
    visible: token.visible,
    revoked: token.revoked,
    created_by: token.createdBy?.email ?? null,
    created_at: iso(token.createdAt),
    last_used_at: iso(token.lastUsedAt),
    last_used_ip: token.lastUsedIp ?? null,
    capabilities: token.capabilities,
  }
}

export async function findRole(values: { id?: unknown; name?: unknown }) {
  const id = values.id === undefined || values.id === null ? '' : String(values.id).trim()
  if (id) return Role.find(Number(id) || 0)
  const name = values.name === undefined || values.name === null ? '' : String(values.name).trim()
  if (!name) return null
  if (/^\d+$/.test(name)) return Role.find(Number(name))
  return Role.query().whereRaw('lower(name) = ?', [name.toLowerCase()]).first()
}

export async function issueServiceToken(
  ctx: HttpContext | null,
  values: { name: unknown; description?: unknown; role: Role; createdBy: User | null }
) {
  const name = typeof values.name === 'string' ? values.name.trim() : ''
  if (!name) invalid({ name: ["can't be blank"] })
  if (name.length > 120) invalid({ name: ['is too long (maximum is 120 characters)'] })
  const description =
    typeof values.description === 'string' && values.description.trim()
      ? values.description.trim()
      : null
  const token = await ServiceToken.issue({
    name,
    description,
    role: values.role,
    createdBy: values.createdBy,
  })
  await audit(ctx ?? { via: 'cli' }, 'service_token.issued', token, {
    name: token.name,
    role: values.role.name,
  })
  return token
}

export async function loadServiceToken(id: unknown) {
  const numeric = Number(id)
  if (!Number.isInteger(numeric)) return null
  return ServiceToken.query().where('id', numeric).preload('role').preload('createdBy').first()
}
