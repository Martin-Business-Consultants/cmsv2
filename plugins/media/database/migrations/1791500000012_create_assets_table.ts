import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'assets'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.string('filename').notNullable()
      table.string('key').notNullable().unique()
      table.string('mime_type').notNullable()
      table.integer('size').notNullable()
      table.integer('width').nullable()
      table.integer('height').nullable()
      table.string('alt').nullable()
      table.text('caption').nullable()
      table.string('folder').notNullable().defaultTo('/')
      table.json('variants').notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
