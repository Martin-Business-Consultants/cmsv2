import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('collections', (table) => {
      table.json('build_config').notNullable().defaultTo('{}')
      table.json('notification_events').notNullable().defaultTo('[]')
      table.text('notification_emails').nullable()
    })
  }

  async down() {
    this.schema.alterTable('collections', (table) => {
      table.dropColumn('build_config')
      table.dropColumn('notification_events')
      table.dropColumn('notification_emails')
    })
  }
}
