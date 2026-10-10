import { exponentialBackoff } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'
import { BaseJob } from '#services/jobs'
import Webhook from '#models/webhook'
import { deliver, isRetryable, type DeliveryJobPayload } from '#services/webhooks'

export class WebhookDeliveryFailed extends Error {}

export default class WebhookDeliveryJob extends BaseJob<DeliveryJobPayload> {
  static options: JobOptions = {
    retry: {
      maxRetries: 3,
      backoff: exponentialBackoff({
        baseDelay: '10s',
        maxDelay: '10m',
        multiplier: 3,
        jitter: true,
      }),
    },
  }

  async handle() {
    const { webhookId, event, data, test } = this.payload
    const webhook = await Webhook.find(webhookId)
    if (!webhook || (!webhook.active && !test)) return
    const delivery = await deliver(webhook, event, data, this.context.attempt)
    if (isRetryable(delivery)) {
      throw new WebhookDeliveryFailed(
        `Webhook ${webhook.id} ${event}: ${delivery.error ?? delivery.responseStatus}`
      )
    }
  }
}
