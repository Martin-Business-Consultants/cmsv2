import { RoleSchema } from '#database/schema'
import { afterDelete, afterSave, hasMany } from '@adonisjs/lucid/orm'
import { indexSearch, unindexSearch } from '#services/search'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import { WILDCARD } from '#types/permissions'
import User from '#models/user'

export default class Role extends RoleSchema {
  declare permissions: string[]

  @hasMany(() => User)
  declare users: HasMany<typeof User>

  get isAdmin() {
    return this.permissions.includes(WILDCARD)
  }

  can(capability: string) {
    return this.isAdmin || this.permissions.includes(capability)
  }

  @afterSave()
  static async syncSearch(record: Role) {
    await indexSearch('role', record)
  }

  @afterDelete()
  static async dropSearch(record: Role) {
    await unindexSearch('role', record.id, record.$trx)
  }
}
