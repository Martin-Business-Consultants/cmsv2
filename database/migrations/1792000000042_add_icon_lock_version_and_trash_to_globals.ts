import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'globals'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('icon').nullable()
      table.integer('lock_version').unsigned().notNullable().defaultTo(0)
      table.timestamp('deleted_at').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('icon')
      table.dropColumn('lock_version')
      table.dropColumn('deleted_at')
    })
  }
}
