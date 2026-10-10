import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'upgrades'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.string('from_version').notNullable()
      table.string('to_version').notNullable()
      table.string('via').notNullable()
      table.string('status').notNullable().defaultTo('succeeded')
      table.string('external_id').nullable()
      table.string('external_url').nullable()
      table.text('message').nullable()
      table
        .integer('requested_by_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table.timestamp('finished_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
      table.index(['created_at'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
