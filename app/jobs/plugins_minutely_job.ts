import logger from '@adonisjs/core/services/logger'
import { BaseJob } from '#services/jobs'
import { plugins } from '#services/plugins'

export default class PluginsMinutelyJob extends BaseJob {
  static options = { maxRetries: 0 }

  async handle() {
    for (const { plugin, name, task } of plugins.dueMinutelyTasks(new Date())) {
      try {
        await task()
      } catch (error) {
        logger.error({ err: error, plugin, task: name }, 'Plugin minutely task failed')
      }
    }
  }
}
