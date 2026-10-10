import { BlockTypeSchema } from '#database/schema'
import { afterDelete, afterSave } from '@adonisjs/lucid/orm'
import { indexSearch, unindexSearch } from '#services/search'
import type { Field, FieldData } from '#types/content'

export default class BlockType extends BlockTypeSchema {
  declare fields: Field[]
  declare defaults: FieldData

  @afterSave()
  static async syncSearch(record: BlockType) {
    await indexSearch('block_type', record)
  }

  @afterDelete()
  static async dropSearch(record: BlockType) {
    await unindexSearch('block_type', record.id, record.$trx)
  }
}
