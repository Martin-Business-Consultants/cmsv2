import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'api_tokens'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table
        .integer('user_id')
        .notNullable()
        .unsigned()
        .unique()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.text('token').nullable()
      table.string('token_digest').notNullable().unique()
      table.string('prefix').notNullable()
      table.timestamp('last_used_at').nullable()
      table.string('last_used_ip').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
