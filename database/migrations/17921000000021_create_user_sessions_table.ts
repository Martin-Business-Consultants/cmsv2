import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'user_sessions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.integer('user_id').unsigned().notNullable().references('users.id').onDelete('CASCADE')
      table.string('user_agent', 512).nullable()
      table.string('ip_address', 64).nullable()
      table.timestamp('last_seen_at').notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
      table.index(['user_id'])
      table.index(['last_seen_at'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
