import { BaseModel, column } from '@adonisjs/lucid/orm'
import type { DateTime } from 'luxon'

export default class AssetFolder extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare path: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  get name() {
    return this.path.split('/').pop() ?? ''
  }

  get parent() {
    return this.path.slice(0, this.path.lastIndexOf('/')) || '/'
  }
}
