import type { ApplicationService } from '@adonisjs/core/types'
import env from '#start/env'

export default class JobsProvider {
  constructor(protected app: ApplicationService) {}

  async ready() {
    if (this.app.getEnvironment() !== 'web' || env.get('QUEUE_WORKER', 'inline') === 'off') return
    const { startWorker } = await import('#services/jobs')
    await startWorker()
  }

  async shutdown() {
    const { stopWorker } = await import('#services/jobs')
    await stopWorker()
  }
}
