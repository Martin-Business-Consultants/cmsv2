import logger from '@adonisjs/core/services/logger'
import { Schedule } from '@adonisjs/queue'
import ProcessScheduledPublishingJob from '#jobs/process_scheduled_publishing_job'
import PluginsMinutelyJob from '#jobs/plugins_minutely_job'
import PluginsNightlyJob from '#jobs/plugins_nightly_job'
import TrashPurgeJob from '#jobs/trash_purge_job'
import SessionCleanupJob from '#jobs/session_cleanup_job'
import VersionPruneJob from '#jobs/version_prune_job'
import DataBackupJob from '#jobs/data_backup_job'
import UpdateCheckJob from '#jobs/update_check_job'

const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

const schedules = [
  () =>
    ProcessScheduledPublishingJob.schedule({})
      .id('scheduled_publishing')
      .cron('* * * * *')
      .timezone(timezone),
  () => PluginsMinutelyJob.schedule({}).id('plugins_minutely').cron('* * * * *').timezone(timezone),
  () => PluginsNightlyJob.schedule({}).id('plugins_nightly').cron('0 1 * * *').timezone(timezone),
  () => TrashPurgeJob.schedule({}).id('trash_purge').cron('0 3 * * *').timezone(timezone),
  () => VersionPruneJob.schedule({}).id('version_prune').cron('30 3 * * *').timezone(timezone),
  () => SessionCleanupJob.schedule({}).id('session_cleanup').cron('17 * * * *').timezone(timezone),
  () => DataBackupJob.schedule({}).id('data_backup').cron('0 2 * * *').timezone(timezone),
  () => UpdateCheckJob.schedule({}).id('update_check').cron('0 4 * * *').timezone(timezone),
]

try {
  const ids = new Set<string>()
  for (const define of schedules) {
    const { scheduleId } = await define().run()
    ids.add(scheduleId)
  }
  for (const schedule of await Schedule.list()) {
    if (!ids.has(schedule.id)) await schedule.delete()
  }
} catch (error) {
  logger.error({ err: error }, 'Could not register scheduled jobs')
}
