import { column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import encryption from '@adonisjs/core/services/encryption'
import { WebhookSchema } from '#database/schema'
import WebhookDelivery from '#models/webhook_delivery'

export default class Webhook extends WebhookSchema {
  declare events: string[]
  declare headers: Record<string, string>
  declare eventFilters: Record<string, unknown>

  @column({
    prepare: (value: string) => encryption.encrypt(value),
    consume: (value: string) => encryption.decrypt<string>(value) ?? value,
  })
  declare secret: string

  @hasMany(() => WebhookDelivery)
  declare deliveries: HasMany<typeof WebhookDelivery>
}
