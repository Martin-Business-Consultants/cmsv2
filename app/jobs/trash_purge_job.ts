import { BaseJob } from '#services/jobs'
import { purgeExpiredTrash } from '#services/trash_retention'

export default class TrashPurgeJob extends BaseJob {
  static options = { maxRetries: 1 }

  async handle() {
    await purgeExpiredTrash()
  }
}
