import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'taggings'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.string('taggable_type').notNullable()
      table.integer('taggable_id').unsigned().notNullable()
      table
        .integer('tag_entry_id')
        .unsigned()
        .notNullable()
        .references('entries.id')
        .onDelete('CASCADE')
      table.integer('position').notNullable().defaultTo(0)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
      table.unique(['taggable_type', 'taggable_id', 'tag_entry_id'])
      table.index(['taggable_type', 'taggable_id'])
      table.index(['tag_entry_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
