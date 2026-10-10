import logger from '@adonisjs/core/services/logger'
import { BaseJob } from '#services/jobs'
import { plugins } from '#services/plugins'

export default class PluginsNightlyJob extends BaseJob {
  static options = { maxRetries: 0 }

  async handle() {
    for (const { plugin, task } of plugins.enabled(plugins.nightlies)) {
      try {
        await task()
      } catch (error) {
        logger.error({ err: error, plugin }, 'Plugin nightly task failed')
      }
    }
  }
}
