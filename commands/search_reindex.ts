import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

export default class SearchReindex extends BaseCommand {
  static commandName = 'search:reindex'
  static description =
    'Put every page, entry, global and the rest (and plugin records) back in the search index.'
  static options: CommandOptions = { startApp: true }

  async run() {
    const { reindexAll } = await import('#services/search')
    const counts = await reindexAll()
    const total = Object.values(counts).reduce((sum, count) => sum + count, 0)
    const kinds = Object.keys(counts).sort().join(', ')
    this.logger.success(`Indexed ${total} records across ${kinds}`)
  }
}
