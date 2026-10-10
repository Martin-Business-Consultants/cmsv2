import { CollectionSchema } from '#database/schema'
import { afterDelete, afterSave, hasMany } from '@adonisjs/lucid/orm'
import { indexSearch, unindexSearch } from '#services/search'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import type { BuildConfig, Field } from '#types/content'
import Entry from '#models/entry'

export default class Collection extends CollectionSchema {
  declare fields: Field[]
  declare buildConfig: BuildConfig
  declare notificationEvents: string[]

  @hasMany(() => Entry)
  declare entries: HasMany<typeof Entry>

  @afterSave()
  static async syncSearch(record: Collection) {
    await indexSearch('collection', record)
  }

  @afterDelete()
  static async dropSearch(record: Collection) {
    await unindexSearch('collection', record.id, record.$trx)
  }
}
