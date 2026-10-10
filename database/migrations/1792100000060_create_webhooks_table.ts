import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'webhooks'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.string('name').notNullable()
      table.string('url', 2000).notNullable()
      table.boolean('active').notNullable().defaultTo(true)
      table.json('events').notNullable()
      table.json('headers').notNullable()
      table.json('event_filters').notNullable()
      table.text('secret').notNullable()
      table.integer('failure_count').notNullable().defaultTo(0)
      table.string('last_status').nullable()
      table.timestamp('last_delivery_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
