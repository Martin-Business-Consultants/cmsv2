import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('collections', (table) => {
      table.integer('categories_collection_id').unsigned().nullable().index()
      table.integer('tags_collection_id').unsigned().nullable().index()
    })
  }

  async down() {
    this.schema.alterTable('collections', (table) => {
      table.dropColumn('categories_collection_id')
      table.dropColumn('tags_collection_id')
    })
  }
}
