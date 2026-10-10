import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'entry_versions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table
        .integer('entry_id')
        .unsigned()
        .notNullable()
        .references('entries.id')
        .onDelete('CASCADE')
      table.integer('user_id').unsigned().nullable().references('users.id').onDelete('SET NULL')
      table.string('title').notNullable()
      table.json('data').notNullable()
      table.json('seo').notNullable()
      table.timestamp('created_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
