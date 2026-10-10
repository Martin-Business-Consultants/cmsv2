import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.defer(async (db) => {
      if (!(await db.schema.hasTable('roles'))) return
      const taken = await db.from('roles').where('name', 'Production site').first()
      if (taken) return
      await db.from('roles').where('name', 'Site').update({
        name: 'Production site',
        description: 'A published site: reads content and nothing else.',
      })
    })
  }

  async down() {
    this.defer(async (db) => {
      await db.from('roles').where('name', 'Production site').update({ name: 'Site' })
    })
  }
}
