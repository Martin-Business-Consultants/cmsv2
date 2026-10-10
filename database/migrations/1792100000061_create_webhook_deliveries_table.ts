import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'webhook_deliveries'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table
        .integer('webhook_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('webhooks')
        .onDelete('CASCADE')
      table.string('event').notNullable()
      table.text('payload').notNullable()
      table.integer('response_status').nullable()
      table.text('response_body').nullable()
      table.text('error').nullable()
      table.integer('duration_ms').nullable()
      table.integer('attempt').notNullable().defaultTo(1)
      table.boolean('success').notNullable().defaultTo(false)
      table.timestamp('created_at').notNullable()
      table.index(['webhook_id', 'created_at'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
