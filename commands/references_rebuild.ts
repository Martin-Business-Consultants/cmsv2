import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

export default class ReferencesRebuild extends BaseCommand {
  static commandName = 'references:rebuild'
  static description =
    'Rebuild the content reference index ("used by") from every page, entry and global.'
  static options: CommandOptions = { startApp: true }

  async run() {
    const { rebuildReferences } = await import('#services/references')
    const counts = await rebuildReferences()
    this.logger.success(
      `Indexed ${counts.page} pages, ${counts.entry} entries and ${counts.global} globals`
    )
  }
}
