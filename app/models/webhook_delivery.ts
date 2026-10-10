import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { WebhookDeliverySchema } from '#database/schema'
import Webhook from '#models/webhook'

export default class WebhookDelivery extends WebhookDeliverySchema {
  @belongsTo(() => Webhook)
  declare webhook: BelongsTo<typeof Webhook>
}
