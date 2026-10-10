import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'forms'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('submit_url').nullable()
      table.string('webhook_url').nullable()
      table.timestamp('deleted_at').nullable().index()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('submit_url')
      table.dropColumn('webhook_url')
      table.dropColumn('deleted_at')
    })
  }
}
