import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'forms'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.string('slug').notNullable().unique()
      table.string('title').notNullable()
      table.string('status').notNullable().defaultTo('draft')
      table.json('fields').notNullable()
      table.string('submit_label').notNullable().defaultTo('Submit')
      table.text('success_message').nullable()
      table.string('notify_emails').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
