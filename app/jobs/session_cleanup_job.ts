import { BaseJob } from '#services/jobs'
import UserSession from '#models/user_session'

export default class SessionCleanupJob extends BaseJob {
  static options = { maxRetries: 0 }

  async handle() {
    await UserSession.expired().delete()
  }
}
