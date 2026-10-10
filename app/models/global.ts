import { GlobalSchema } from '#database/schema'
import { afterDelete, afterSave, beforeUpdate, scope } from '@adonisjs/lucid/orm'
import { indexSearch, unindexSearch } from '#services/search'
import type { Field, FieldData } from '#types/content'
import { indexReferences, removeReferences } from '#services/references'

export default class Global extends GlobalSchema {
  declare fields: Field[]
  declare data: FieldData

  static active = scope((query) => {
    query.whereNull('deleted_at')
  })

  static trashed = scope((query) => {
    query.whereNotNull('deleted_at')
  })

  @afterSave()
  static async syncReferences(record: Global) {
    await indexReferences('global', record)
  }

  @afterDelete()
  static async dropReferences(record: Global) {
    await removeReferences('global', record.id, record.$trx)
  }

  @beforeUpdate()
  static bumpLockVersion(record: Global) {
    if (record.$isDirty) record.lockVersion = (record.$original.lockVersion ?? 0) + 1
  }

  @afterSave()
  static async syncSearch(record: Global) {
    await indexSearch('global', record)
  }

  @afterDelete()
  static async dropSearch(record: Global) {
    await unindexSearch('global', record.id, record.$trx)
  }
}
