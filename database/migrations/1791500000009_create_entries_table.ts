import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'entries'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table
        .integer('collection_id')
        .unsigned()
        .notNullable()
        .references('collections.id')
        .onDelete('CASCADE')
      table.string('title').notNullable()
      table.string('slug').notNullable()
      table.string('status').notNullable().defaultTo('draft')
      table.json('data').notNullable()
      table.json('seo').notNullable()
      table.timestamp('published_at').nullable()
      table.timestamp('deleted_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
      table.index(['collection_id', 'slug'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
