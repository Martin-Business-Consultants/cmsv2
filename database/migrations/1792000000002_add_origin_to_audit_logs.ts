import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'audit_logs'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('via').notNullable().defaultTo('admin')
      table.string('actor_type').nullable()
      table.integer('actor_id').nullable()
      table.string('user_agent', 512).nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('via')
      table.dropColumn('actor_type')
      table.dropColumn('actor_id')
      table.dropColumn('user_agent')
    })
  }
}
