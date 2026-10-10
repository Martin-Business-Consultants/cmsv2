import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'assets'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('title').nullable()
      table.text('description').nullable()
      table.float('focal_x').notNullable().defaultTo(0.5)
      table.float('focal_y').notNullable().defaultTo(0.5)
      table.timestamp('deleted_at').nullable()
      table.index(['folder'])
      table.index(['deleted_at'])
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropIndex(['folder'])
      table.dropIndex(['deleted_at'])
      table.dropColumns('title', 'description', 'focal_x', 'focal_y', 'deleted_at')
    })
  }
}
