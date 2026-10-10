import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'service_tokens'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.string('name', 120).notNullable()
      table.text('description').nullable()
      table
        .integer('role_id')
        .notNullable()
        .unsigned()
        .references('id')
        .inTable('roles')
        .onDelete('RESTRICT')
      table
        .integer('created_by_id')
        .nullable()
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table.text('token').nullable()
      table.string('token_digest').notNullable().unique()
      table.string('prefix').notNullable()
      table.timestamp('last_used_at').nullable()
      table.string('last_used_ip').nullable()
      table.timestamp('revoked_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
      table.index(['revoked_at'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
