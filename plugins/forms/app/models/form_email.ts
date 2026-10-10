import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type { EmailKind } from '../types.js'
import Form from './form.js'

export default class FormEmail extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare formId: number

  @column()
  declare kind: EmailKind

  @column({ consume: (value: unknown) => Boolean(value) })
  declare enabled: boolean

  @column()
  declare recipients: string | null

  @column()
  declare fromField: string | null

  @column()
  declare subject: string

  @column()
  declare body: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Form)
  declare form: BelongsTo<typeof Form>

  get recipientList() {
    return (this.recipients ?? '')
      .split(/[,\n]/)
      .map((email) => email.trim())
      .filter(Boolean)
  }
}
