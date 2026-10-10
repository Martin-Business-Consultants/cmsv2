import { BaseSchema } from '@adonisjs/lucid/schema'

const LEGACY_CAPABILITIES = ['api_clients:read', 'api_clients:write', 'api_clients:delete']

function parse(value: unknown): string[] {
  if (Array.isArray(value)) return value
  try {
    const parsed = JSON.parse(String(value ?? '[]'))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function moment(value: unknown) {
  if (value === null || value === undefined || value === '') return null
  const raw = String(value)
  const date =
    typeof value === 'number' || /^\d+$/.test(raw)
      ? new Date(Number(raw))
      : new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(raw) ? raw : `${raw.replace(' ', 'T')}Z`)
  return Number.isNaN(date.getTime()) ? null : date
}

function stamp(date: Date | null) {
  return date ? date.toISOString().slice(0, 19).replace('T', ' ') : null
}

export default class extends BaseSchema {
  async up() {
    this.defer(async (db) => {
      const clients = await db.from('api_clients')
      const tokens = await db.from('auth_access_tokens').orderBy('id')
      const now = new Date()
      for (const token of tokens) {
        const client = clients.find((row) => row.id === token.tokenable_id)
        if (!client) continue
        const expiresAt = moment(token.expires_at)
        const name = token.name ? `${client.name} — ${token.name}` : client.name
        await db.table('service_tokens').insert({
          name: String(name).slice(0, 120),
          description: client.description ?? null,
          role_id: client.role_id,
          created_by_id: null,
          token: null,
          token_digest: token.hash,
          prefix: `lp_${Buffer.from(String(token.id)).toString('base64url')}.`,
          last_used_at: stamp(moment(token.last_used_at)),
          last_used_ip: null,
          revoked_at: expiresAt && expiresAt <= now ? stamp(expiresAt) : null,
          created_at: stamp(moment(token.created_at) ?? now),
          updated_at: stamp(now),
        })
      }

      const roles = await db.from('roles').select('id', 'permissions')
      for (const role of roles) {
        const permissions = parse(role.permissions)
        const kept = permissions.filter((permission) => !LEGACY_CAPABILITIES.includes(permission))
        if (kept.length === permissions.length) continue
        await db
          .from('roles')
          .where('id', role.id)
          .update({ permissions: JSON.stringify(kept) })
      }
    })

    this.schema.dropTable('auth_access_tokens')
    this.schema.dropTable('api_clients')
  }

  async down() {
    this.schema.createTable('api_clients', (table) => {
      table.increments('id')
      table.string('name').notNullable()
      table.text('description').nullable()
      table
        .integer('role_id')
        .notNullable()
        .unsigned()
        .references('id')
        .inTable('roles')
        .onDelete('RESTRICT')
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
    this.schema.createTable('auth_access_tokens', (table) => {
      table.increments('id')
      table
        .integer('tokenable_id')
        .notNullable()
        .unsigned()
        .references('id')
        .inTable('api_clients')
        .onDelete('CASCADE')
      table.string('type').notNullable()
      table.string('name').nullable()
      table.string('hash').notNullable()
      table.text('abilities').notNullable()
      table.timestamp('created_at')
      table.timestamp('updated_at')
      table.timestamp('last_used_at').nullable()
      table.timestamp('expires_at').nullable()
    })
  }
}
