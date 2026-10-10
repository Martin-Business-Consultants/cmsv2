import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'device_authorizations'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.string('user_code').notNullable().unique()
      table.string('device_code').notNullable().unique()
      table.string('purpose').notNullable().defaultTo('user')
      table.string('hostname', 80).nullable()
      table.string('label', 80).nullable()
      table
        .integer('user_id')
        .nullable()
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.timestamp('approved_at').nullable()
      table.timestamp('denied_at').nullable()
      table.timestamp('expires_at').notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
      table.index(['expires_at'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
