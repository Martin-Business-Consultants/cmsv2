import { BaseJob } from '#services/jobs'
import type { JobOptions } from '@adonisjs/queue/types'
import { postSubmissionWebhook } from '../services/webhooks.js'
import { recordSubmissionMeta } from '../services/emails.js'

export default class PostFormWebhookJob extends BaseJob<{ submissionId: number }> {
  static options: JobOptions = { maxRetries: 3 }

  async handle() {
    await postSubmissionWebhook(this.payload.submissionId)
  }

  async failed(error: Error) {
    await super.failed(error)
    await recordSubmissionMeta(this.payload.submissionId, (meta) => ({
      ...meta,
      webhook: meta.webhook ?? { status: null, at: new Date().toISOString() },
    }))
  }
}
