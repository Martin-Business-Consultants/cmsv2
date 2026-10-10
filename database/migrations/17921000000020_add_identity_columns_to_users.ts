import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.timestamp('verified_at').nullable()
      table.string('totp_secret').nullable()
      table.timestamp('totp_enabled_at').nullable()
      table.json('recovery_code_digests').nullable()
    })
    this.defer(async (db) => {
      await db.from(this.tableName).update({ verified_at: db.raw('created_at') })
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('verified_at')
      table.dropColumn('totp_secret')
      table.dropColumn('totp_enabled_at')
      table.dropColumn('recovery_code_digests')
    })
  }
}
