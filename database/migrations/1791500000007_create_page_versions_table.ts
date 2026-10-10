import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'page_versions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.integer('page_id').unsigned().notNullable().references('pages.id').onDelete('CASCADE')
      table.integer('user_id').unsigned().nullable().references('users.id').onDelete('SET NULL')
      table.string('title').notNullable()
      table.json('blocks').notNullable()
      table.json('seo').notNullable()
      table.timestamp('created_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
