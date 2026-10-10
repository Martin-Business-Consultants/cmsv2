import type { JobOptions } from '@adonisjs/queue/types'
import { BaseJob } from '#services/jobs'
import { sendIdentityMail, type IdentityMailKind } from '#services/identity_mail'

export default class SendIdentityMailJob extends BaseJob<{
  userId: number
  kind: IdentityMailKind
}> {
  static options: JobOptions = { maxRetries: 3 }

  async handle() {
    await sendIdentityMail(this.payload.userId, this.payload.kind)
  }
}
