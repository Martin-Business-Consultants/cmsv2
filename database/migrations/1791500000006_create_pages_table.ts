import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'pages'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.integer('parent_id').unsigned().nullable().references('pages.id').onDelete('SET NULL')
      table.string('title').notNullable()
      table.string('slug').notNullable()
      table.string('path').notNullable().index()
      table.string('status').notNullable().defaultTo('draft')
      table.json('blocks').notNullable()
      table.json('seo').notNullable()
      table.timestamp('published_at').nullable()
      table.timestamp('deleted_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
