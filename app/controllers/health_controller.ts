import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'

export default class HealthController {
  async show({ response }: HttpContext) {
    response.header('Cache-Control', 'no-store')
    try {
      await db.rawQuery('select 1')
      return response.ok({ status: 'ok' })
    } catch {
      return response.serviceUnavailable({ status: 'unavailable', database: 'unreachable' })
    }
  }
}
