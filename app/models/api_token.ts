import { ApiTokenSchema } from '#database/schema'
import { belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import User from '#models/user'
import {
  USE_THROTTLE_MS,
  candidateDigests,
  decryptToken,
  generatePlaintext,
  maskToken,
  tokenColumns,
} from '#services/tokens'

export default class ApiToken extends ApiTokenSchema {
  static PREFIX = 'lp_'
  static PREFIX_LENGTH = 11

  @column({ serializeAs: null })
  declare token: string | null

  @column({ serializeAs: null })
  declare tokenDigest: string

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  static async for(user: User) {
    return (await this.findBy('userId', user.id)) ?? (await this.createFor(user))
  }

  static async createFor(user: User) {
    try {
      return await this.create({
        userId: user.id,
        lastUsedAt: null,
        lastUsedIp: null,
        ...tokenColumns(generatePlaintext(this.PREFIX), this.PREFIX_LENGTH),
      })
    } catch (error) {
      const existing = await this.findBy('userId', user.id)
      if (existing) return existing
      throw error
    }
  }

  static async authenticate(plaintext: string | null | undefined) {
    if (!plaintext) return null
    return this.query()
      .whereIn('token_digest', candidateDigests(plaintext))
      .preload('user', (query) => query.preload('role'))
      .first()
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

  async rotate() {
    const plaintext = generatePlaintext(ApiToken.PREFIX)
    Object.assign(this, tokenColumns(plaintext, ApiToken.PREFIX_LENGTH))
    this.lastUsedAt = null
    this.lastUsedIp = null
    await this.save()
    return plaintext
  }

  async recordUse(ip: string | null) {
    if (this.lastUsedAt && this.lastUsedAt.toMillis() > Date.now() - USE_THROTTLE_MS) return
    this.lastUsedAt = DateTime.now()
    this.lastUsedIp = ip
    await this.save()
  }

  can(capability: string) {
    return this.user?.can(capability) ?? false
  }
}
