import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'block_types'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.string('slug').notNullable().unique()
      table.string('label').notNullable()
      table.string('category').nullable()
      table.string('description').nullable()
      table.string('icon').nullable()
      table.json('fields').notNullable()
      table.json('defaults').notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
