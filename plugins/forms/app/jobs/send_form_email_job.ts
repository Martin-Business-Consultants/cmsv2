import { BaseJob } from '#services/jobs'
import type { JobOptions } from '@adonisjs/queue/types'
import { recordSubmissionMeta, sendSubmissionEmail } from '../services/emails.js'
import type { EmailKind } from '../types.js'

export default class SendFormEmailJob extends BaseJob<{ submissionId: number; kind: EmailKind }> {
  static options: JobOptions = { maxRetries: 3 }

  async handle() {
    await sendSubmissionEmail(this.payload.submissionId, this.payload.kind)
  }

  async failed(error: Error) {
    await super.failed(error)
    await recordSubmissionMeta(this.payload.submissionId, (meta) => ({
      ...meta,
      emails: { ...meta.emails, [this.payload.kind]: 'failed' },
    }))
  }
}
