import type { JobOptions } from '@adonisjs/queue/types'
import { BaseJob } from '#services/jobs'
import { triggerNow } from '#services/deploys'

export default class DeployTriggerJob extends BaseJob<{ scheduledAt: string; reason: string }> {
  static options: JobOptions = { maxRetries: 0 }

  async handle() {
    await triggerNow(this.payload.scheduledAt, this.payload.reason)
  }
}
