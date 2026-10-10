import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

export default class CmsBackup extends BaseCommand {
  static commandName = 'cms:backup'
  static description =
    'Archive the data directory (every SQLite database, copied online, plus uploads) into storage/backups and print its path.'
  static options: CommandOptions = { startApp: true }

  @flags.boolean({ description: 'Only back up when migrations are pending (used before migrating)' })
  declare ifPending: boolean

  @flags.boolean({ description: 'Also hand the archive to CMS_BACKUP_COMMAND' })
  declare ship: boolean

  async run() {
    const { backupDataDir, pendingMigrations, shipArchive } = await import('#services/backups')
    if (this.ifPending && !(await pendingMigrations())) {
      process.stderr.write('No pending migrations: no backup needed\n')
      return
    }
    try {
      const archive = await backupDataDir()
      if (!archive) {
        process.stderr.write('Nothing to back up yet\n')
        return
      }
      if (this.ship) await shipArchive(archive)
      process.stdout.write(`${archive}\n`)
    } catch (error) {
      this.logger.error(`Backup failed: ${(error as Error).message}`)
      this.exitCode = 1
    }
  }
}
