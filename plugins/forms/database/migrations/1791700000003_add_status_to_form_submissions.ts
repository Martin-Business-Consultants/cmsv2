import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'form_submissions'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('status').notNullable().defaultTo('new').index()
      table.json('meta').nullable()
      table.timestamp('updated_at').nullable()
      table.index(['form_id', 'created_at'])
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropIndex(['form_id', 'created_at'])
      table.dropColumn('status')
      table.dropColumn('meta')
      table.dropColumn('updated_at')
    })
  }
}
