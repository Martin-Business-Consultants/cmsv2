import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.defer(async (db) => {
      if (!(await db.schema.hasTable('roles'))) return
      const roles = await db.from('roles').whereNot('name', 'Agent').select('id', 'permissions')
      for (const role of roles) {
        const permissions: string[] =
          typeof role.permissions === 'string' ? JSON.parse(role.permissions) : role.permissions
        if (!permissions.includes('globals:write')) continue
        const next = [...new Set([...permissions, 'globals:publish', 'globals:delete'])]
        if (next.length === permissions.length) continue
        await db
          .from('roles')
          .where('id', role.id)
          .update({ permissions: JSON.stringify(next) })
      }
    })
  }

  async down() {}
}
