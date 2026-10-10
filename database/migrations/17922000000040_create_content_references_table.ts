import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'content_references'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.string('owner_type', 20).notNullable()
      table.integer('owner_id').unsigned().notNullable()
      table.string('ref_type', 40).notNullable()
      table.string('ref_id', 120).notNullable()
      table.string('kind', 40).notNullable()
      table.string('path', 255).notNullable().defaultTo('')
      table.integer('position').notNullable().defaultTo(-1)
      table.timestamp('created_at').notNullable()
      table.index(['owner_type', 'owner_id'])
      table.index(['ref_type', 'ref_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
