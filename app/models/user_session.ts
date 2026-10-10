import { UserSessionSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import User from '#models/user'

export const SESSION_LIFETIME = { days: 30 }
export const SESSION_IDLE_TIMEOUT = { days: 14 }
export const SESSION_SEEN_EVERY = { hours: 1 }

export default class UserSession extends UserSessionSchema {
  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  get expiresAt() {
    return this.createdAt.plus(SESSION_LIFETIME)
  }

  isExpired(now = DateTime.now()) {
    return (
      this.createdAt <= now.minus(SESSION_LIFETIME) ||
      this.lastSeenAt <= now.minus(SESSION_IDLE_TIMEOUT)
    )
  }

  static expired(now = DateTime.utc()) {
    const format = (value: DateTime) => value.toUTC().toFormat('yyyy-MM-dd HH:mm:ss')
    return this.query()
      .where('created_at', '<=', format(now.minus(SESSION_LIFETIME)))
      .orWhere('last_seen_at', '<=', format(now.minus(SESSION_IDLE_TIMEOUT)))
  }
}
