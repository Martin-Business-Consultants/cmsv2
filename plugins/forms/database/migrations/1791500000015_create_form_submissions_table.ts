import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'form_submissions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.integer('form_id').unsigned().notNullable().references('forms.id').onDelete('CASCADE')
      table.json('data').notNullable()
      table.string('ip').nullable()
      table.string('user_agent').nullable()
      table.timestamp('created_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
