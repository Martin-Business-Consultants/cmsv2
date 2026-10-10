import { DeviceAuthorizationSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { randomBytes, randomInt } from 'node:crypto'
import { DateTime } from 'luxon'
import User from '#models/user'
import Role from '#models/role'
import ApiToken from '#models/api_token'
import ServiceToken from '#models/service_token'
import { SITE_ROLE_NAME } from '#types/permissions'

const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ'
const PURPOSES = ['user', 'site'] as const

export type DevicePurpose = (typeof PURPOSES)[number]

function stamp(value: DateTime) {
  return value.toUTC().toFormat('yyyy-MM-dd HH:mm:ss')
}

function trimmed(value: unknown) {
  const text = typeof value === 'string' ? value.slice(0, 80).trim() : ''
  return text || null
}

function userCode() {
  const chars = Array.from({ length: 8 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)])
  return `${chars.slice(0, 4).join('')}-${chars.slice(4).join('')}`
}

export default class DeviceAuthorization extends DeviceAuthorizationSchema {
  static TTL = { minutes: 15 }
  static SITE_ROLE = SITE_ROLE_NAME

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  static async mint(values: { hostname?: unknown; purpose?: unknown; label?: unknown }) {
    await this.query()
      .where('expires_at', '<', stamp(DateTime.utc().minus({ days: 1 })))
      .delete()
    const purpose = PURPOSES.includes(values.purpose as DevicePurpose)
      ? (values.purpose as DevicePurpose)
      : 'user'
    for (let attempt = 0; ; attempt++) {
      const code = userCode()
      if (attempt < 5 && (await this.findBy('userCode', code))) continue
      return this.create({
        userCode: code,
        deviceCode: `cmsd_${randomBytes(32).toString('base64url')}`,
        purpose,
        hostname: trimmed(values.hostname),
        label: trimmed(values.label),
        expiresAt: DateTime.now().plus(this.TTL),
      })
    }
  }

  static async findByUserCode(code: unknown) {
    const normalized = String(code ?? '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
    if (normalized.length !== 8) return null
    return this.query()
      .where('user_code', `${normalized.slice(0, 4)}-${normalized.slice(4)}`)
      .preload('user')
      .first()
  }

  get site() {
    return this.purpose === 'site'
  }

  get expired() {
    return this.expiresAt <= DateTime.now()
  }

  get approved() {
    return Boolean(this.approvedAt) && Boolean(this.userId)
  }

  get denied() {
    return Boolean(this.deniedAt)
  }

  get pending() {
    return !this.approved && !this.denied && !this.expired
  }

  approvableBy(user: User | null | undefined) {
    return Boolean(user) && (!this.site || user!.can('settings:write'))
  }

  async approve(user: User) {
    this.userId = user.id
    this.approvedAt = DateTime.now()
    await this.save()
  }

  async deny() {
    this.deniedAt = DateTime.now()
    await this.save()
  }

  async claim(): Promise<{ token: ApiToken | ServiceToken; plaintext: string; user: User }> {
    if (!this.approved) throw new Error('cannot claim an unapproved authorization')
    const user = await User.query().where('id', this.userId!).preload('role').firstOrFail()
    const deleted = await DeviceAuthorization.query().where('id', this.id).delete()
    if (!Number(Array.isArray(deleted) ? deleted[0] : deleted)) {
      throw new Error('authorization already claimed')
    }
    if (this.site) {
      const role = await Role.findByOrFail('name', SITE_ROLE_NAME)
      const token = await ServiceToken.issue({
        name: (this.label || 'Site build').slice(0, 60),
        role,
        createdBy: user,
        description: `Issued to ${this.hostname || 'a site'} by the Astro installer.`,
      })
      return { token, plaintext: token.readableToken!, user }
    }
    const token = await ApiToken.for(user)
    const plaintext = token.readableToken ?? (await token.rotate())
    return { token, plaintext, user }
  }
}
