import { BaseJob } from '#services/jobs'
import { nightlyBackup, nightlyEnabled } from '#services/backups'

export default class DataBackupJob extends BaseJob {
  static options = { maxRetries: 1 }

  async handle() {
    if (!nightlyEnabled()) return
    await nightlyBackup()
  }
}
