import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type { SubmissionMeta, SubmissionStatus, SubmissionValue } from '../types.js'
import Form from './form.js'

const json = (fallback: unknown) => ({
  prepare: (value: unknown) => JSON.stringify(value ?? fallback),
  consume: (value: unknown) =>
    typeof value === 'string' ? JSON.parse(value) : (value ?? fallback),
})

export default class FormSubmission extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare formId: number

  @column(json({}))
  declare data: Record<string, SubmissionValue>

  @column()
  declare status: SubmissionStatus

  @column(json({}))
  declare meta: SubmissionMeta

  @column()
  declare ip: string | null

  @column()
  declare userAgent: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Form)
  declare form: BelongsTo<typeof Form>
}
