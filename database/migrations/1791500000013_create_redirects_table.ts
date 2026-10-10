import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'redirects'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.string('source').notNullable().unique()
      table.string('destination').notNullable()
      table.integer('status_code').notNullable().defaultTo(301)
      table.boolean('is_active').notNullable().defaultTo(true)
      table.integer('hits').notNullable().defaultTo(0)
      table.timestamp('last_hit_at').nullable()
      table.text('notes').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
