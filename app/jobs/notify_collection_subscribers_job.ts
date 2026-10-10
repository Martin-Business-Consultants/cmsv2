import type { JobOptions } from '@adonisjs/queue/types'
import { BaseJob } from '#services/jobs'
import {
  sendCollectionNotification,
  type NotificationPayload,
} from '#services/collection_notifications'

export default class NotifyCollectionSubscribersJob extends BaseJob<NotificationPayload> {
  static options: JobOptions = { maxRetries: 3 }

  async handle() {
    await sendCollectionNotification(this.payload)
  }
}
