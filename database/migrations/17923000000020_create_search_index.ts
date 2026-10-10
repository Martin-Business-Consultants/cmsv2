import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'search_index'

  async up() {
    this.schema.raw(
      `CREATE VIRTUAL TABLE ${this.tableName} USING fts5(record_type UNINDEXED, record_id UNINDEXED, title, body, tokenize = 'trigram')`
    )
  }

  async down() {
    this.schema.raw(`DROP TABLE IF EXISTS ${this.tableName}`)
  }
}
