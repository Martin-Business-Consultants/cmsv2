import { DateTime } from 'luxon'
import { afterDelete, afterSave, BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import { indexSearchDocument, unindexSearch } from '#services/search'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import type { FormField, FormStatus } from '../types.js'
import FormSubmission from './form_submission.js'
import FormEmail from './form_email.js'

const json = {
  prepare: (value: unknown) => JSON.stringify(value ?? []),
  consume: (value: unknown) => (typeof value === 'string' ? JSON.parse(value) : value),
}

export default class Form extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare slug: string

  @column()
  declare title: string

  @column()
  declare status: FormStatus

  @column(json)
  declare fields: FormField[]

  @column()
  declare submitLabel: string

  @column()
  declare successMessage: string | null

  @column()
  declare submitUrl: string | null

  @column()
  declare webhookUrl: string | null

  @column.dateTime()
  declare deletedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @hasMany(() => FormSubmission)
  declare submissions: HasMany<typeof FormSubmission>

  @hasMany(() => FormEmail)
  declare emails: HasMany<typeof FormEmail>

  get isLive() {
    return this.status === 'published' && !this.deletedAt
  }

  get searchDocument() {
    return {
      id: this.id,
      title: this.title,
      body: [this.slug, ...(this.fields ?? []).map((field) => field.label), this.successMessage]
        .filter(Boolean)
        .join('\n'),
    }
  }

  @afterSave()
  static async syncSearch(form: Form) {
    if (form.deletedAt) await unindexSearch('form', form.id)
    else await indexSearchDocument('form', form.searchDocument)
  }

  @afterDelete()
  static async dropSearch(form: Form) {
    await unindexSearch('form', form.id)
  }
}
