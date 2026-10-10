import { BaseJob } from '#services/jobs'
import { checking, checkQuietly, recordRunningVersion, updateRepo } from '#services/updates'

export default class UpdateCheckJob extends BaseJob {
  static options = { maxRetries: 1 }

  async handle() {
    await recordRunningVersion()
    if (checking() && (await updateRepo())) await checkQuietly()
  }
}
