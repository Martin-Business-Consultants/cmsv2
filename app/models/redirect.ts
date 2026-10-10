import { RedirectSchema } from '#database/schema'
import { afterDelete, afterSave } from '@adonisjs/lucid/orm'
import { indexSearch, unindexSearch } from '#services/search'

export default class Redirect extends RedirectSchema {
  @afterSave()
  static async syncSearch(record: Redirect) {
    await indexSearch('redirect', record)
  }

  @afterDelete()
  static async dropSearch(record: Redirect) {
    await unindexSearch('redirect', record.id, record.$trx)
  }
}
