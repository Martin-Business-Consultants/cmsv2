import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'audit_logs'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.integer('user_id').unsigned().nullable().references('users.id').onDelete('SET NULL')
      table.string('actor_label').notNullable()
      table.string('action').notNullable().index()
      table.string('subject_type').nullable()
      table.integer('subject_id').nullable()
      table.string('subject_label').nullable()
      table.json('metadata').notNullable()
      table.string('ip').nullable()
      table.timestamp('created_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
