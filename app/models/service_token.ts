import { ServiceTokenSchema } from '#database/schema'
import { belongsTo, column, scope } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Role from '#models/role'
import User from '#models/user'
import {
  USE_THROTTLE_MS,
  candidateDigests,
  decryptToken,
  generatePlaintext,
  grantedCapabilities,
  maskToken,
  tokenColumns,
} from '#services/tokens'

export default class ServiceToken extends ServiceTokenSchema {
  static PREFIX = 'lps_'
  static PREFIX_LENGTH = 12

  @column({ serializeAs: null })
  declare token: string | null

  @column({ serializeAs: null })
  declare tokenDigest: string

  @belongsTo(() => Role)
  declare role: BelongsTo<typeof Role>

  @belongsTo(() => User, { foreignKey: 'createdById' })
  declare createdBy: BelongsTo<typeof User>

  static active = scope((query) => {
    query.whereNull('revoked_at')
  })

  static ordered = scope((query) => {
    query.orderByRaw('revoked_at is not null').orderBy('revoked_at', 'asc').orderBy('id', 'desc')
  })

  static async issue(values: {
    name: string
    role: Role
    description?: string | null
    createdBy?: User | null
  }) {
    const token = await this.create({
      name: values.name,
      description: values.description || null,
      roleId: values.role.id,
      createdById: values.createdBy?.id ?? null,
      lastUsedAt: null,
      lastUsedIp: null,
      revokedAt: null,
      ...tokenColumns(generatePlaintext(this.PREFIX), this.PREFIX_LENGTH),
    })
    token.$setRelated('role', values.role)
    if (values.createdBy) token.$setRelated('createdBy', values.createdBy)
    return token
  }

  static async authenticate(plaintext: string | null | undefined) {
    if (!plaintext) return null
    return this.query()
      .apply((scopes) => scopes.active())
      .whereIn('token_digest', candidateDigests(plaintext))
      .preload('role')
      .first()
  }

  get revoked() {
    return Boolean(this.revokedAt)
  }

  get readableToken() {
    return decryptToken(this.token)
  }

  get visible() {
    return this.readableToken !== null
  }

  get masked() {
    return maskToken(this.prefix)
  }

  get capabilities() {
    return grantedCapabilities(this.role)
  }

  can(capability: string) {
    if (this.revoked) return false
    return this.role?.can(capability) ?? false
  }

  async rotate() {
    const plaintext = generatePlaintext(ServiceToken.PREFIX)
    Object.assign(this, tokenColumns(plaintext, ServiceToken.PREFIX_LENGTH))
    this.lastUsedAt = null
    this.lastUsedIp = null
    await this.save()
    return plaintext
  }

  async revoke() {
    if (this.revoked) return
    this.revokedAt = DateTime.now()
    await this.save()
  }

  async recordUse(ip: string | null) {
    if (this.lastUsedAt && this.lastUsedAt.toMillis() > Date.now() - USE_THROTTLE_MS) return
    this.lastUsedAt = DateTime.now()
    this.lastUsedIp = ip
    await this.save()
  }
}
