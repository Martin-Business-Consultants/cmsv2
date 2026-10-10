import logger from '@adonisjs/core/services/logger'
import { BaseJob } from '#services/jobs'
import { pruneVersions } from '#services/versions'

export default class VersionPruneJob extends BaseJob {
  static options = { maxRetries: 1 }

  async handle() {
    const { keep, pages, entries } = await pruneVersions()
    if (pages || entries) logger.info({ keep, pages, entries }, 'Pruned old versions')
  }
}
