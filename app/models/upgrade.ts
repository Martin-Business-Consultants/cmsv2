import { belongsTo, scope } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { UpgradeSchema } from '#database/schema'
import User from '#models/user'

export default class Upgrade extends UpgradeSchema {
  @belongsTo(() => User, { foreignKey: 'requestedById' })
  declare requestedBy: BelongsTo<typeof User>

  static ordered = scope((query) => {
    query.orderBy('created_at', 'desc').orderBy('id', 'desc')
  })
}
