import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'entries'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.timestamp('publish_at').nullable().index()
      table.timestamp('unpublish_at').nullable().index()
      table.integer('lock_version').unsigned().notNullable().defaultTo(0)
    })

    this.defer(async (db) => {
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
      const scheduled = await db
        .from(this.tableName)
        .where('status', 'published')
        .where('published_at', '>', now)
        .select('id', 'published_at')
      for (const row of scheduled) {
        await db
          .from(this.tableName)
          .where('id', row.id)
          .update({ status: 'draft', publish_at: row.published_at, published_at: null })
      }
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('publish_at')
      table.dropColumn('unpublish_at')
      table.dropColumn('lock_version')
    })
  }
}
