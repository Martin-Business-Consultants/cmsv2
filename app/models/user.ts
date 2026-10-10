import { UserSchema } from '#database/schema'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import {
  afterCreate,
  afterDelete,
  afterSave,
  belongsTo,
  column,
  hasMany,
} from '@adonisjs/lucid/orm'
import { indexSearch, unindexSearch } from '#services/search'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import { plugins } from '#services/plugins'
import Role from '#models/role'
import UserSession from '#models/user_session'
import {
  digestRecoveryCode,
  generateRecoveryCodes,
  randomSecret,
  verifyCode,
} from '#services/two_factor'

export default class User extends compose(UserSchema, withAuthFinder(hash)) {
  @column({ serializeAs: null })
  declare totpSecret: string | null

  @column({
    serializeAs: null,
    prepare: (value: unknown) => JSON.stringify(value ?? null),
    consume: (value: unknown) => {
      if (typeof value !== 'string') return value
      try {
        return JSON.parse(value)
      } catch {
        return null
      }
    },
  })
  declare recoveryCodeDigests: string[] | null

  @belongsTo(() => Role)
  declare role: BelongsTo<typeof Role>

  @hasMany(() => UserSession)
  declare sessions: HasMany<typeof UserSession>

  @afterCreate()
  static async mintApiToken(user: User) {
    const { default: ApiToken } = await import('#models/api_token')
    await ApiToken.for(user)
  }

  get displayName() {
    return this.fullName || this.email
  }

  get initials() {
    const [first, last] = this.fullName ? this.fullName.split(' ') : this.email.split('@')
    if (first && last) {
      return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()
    }
    return `${first.slice(0, 2)}`.toUpperCase()
  }

  get isVerified() {
    return this.verifiedAt !== null
  }

  get totpEnabled() {
    return this.totpEnabledAt !== null
  }

  get recoveryCodesLeft() {
    return Array.isArray(this.recoveryCodeDigests) ? this.recoveryCodeDigests.length : 0
  }

  get capabilities(): string[] {
    if (!this.role) return []
    return this.role.isAdmin
      ? plugins.permissionCatalog().flatMap((group) => group.capabilities)
      : this.role.permissions
  }

  can(capability: string) {
    return this.role?.can(capability) ?? false
  }

  async ensureTotpSecret() {
    if (this.totpSecret || this.totpEnabled) return
    this.totpSecret = randomSecret()
    await this.save()
  }

  verifyTotp(code: string) {
    return verifyCode(this.totpSecret, code)
  }

  async enableTotp(code: string) {
    if (!this.verifyTotp(code)) return null
    const { codes, digests } = generateRecoveryCodes()
    this.totpEnabledAt = DateTime.now()
    this.recoveryCodeDigests = digests
    await this.save()
    return codes
  }

  async disableTotp() {
    this.totpSecret = null
    this.totpEnabledAt = null
    this.recoveryCodeDigests = []
    await this.save()
  }

  async regenerateRecoveryCodes() {
    const { codes, digests } = generateRecoveryCodes()
    this.recoveryCodeDigests = digests
    await this.save()
    return codes
  }

  async consumeRecoveryCode(code: string) {
    const digest = digestRecoveryCode(code)
    const digests = this.recoveryCodeDigests ?? []
    if (!digests.includes(digest)) return false
    this.recoveryCodeDigests = digests.filter((value) => value !== digest)
    await this.save()
    return true
  }

  @afterSave()
  static async syncSearch(record: User) {
    await indexSearch('user', record)
  }

  @afterDelete()
  static async dropSearch(record: User) {
    await unindexSearch('user', record.id, record.$trx)
  }
}
