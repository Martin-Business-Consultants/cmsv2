import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('entries', (table) => {
      table.string('locale', 20).notNullable().defaultTo('en').index()
      table.integer('category_entry_id').unsigned().nullable().index()
      table.integer('translation_group_id').unsigned().nullable().index()
    })
  }

  async down() {
    this.schema.alterTable('entries', (table) => {
      table.dropIndex('locale')
      table.dropIndex('category_entry_id')
      table.dropIndex('translation_group_id')
      table.dropColumn('locale')
      table.dropColumn('category_entry_id')
      table.dropColumn('translation_group_id')
    })
  }
}
