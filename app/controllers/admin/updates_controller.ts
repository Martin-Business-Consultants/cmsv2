import type { HttpContext } from '@adonisjs/core/http'
import {
  GithubUnavailable,
  checkNow,
  cmsVersion,
  strategyDescription,
  updateAvailable,
  updatesSummary,
} from '#services/updates'

export default class UpdatesController {
  async show({ inertia, bouncer }: HttpContext) {
    await bouncer.authorize('access', 'settings:read')
    const summary = await updatesSummary()
    return inertia.render('admin/settings/updates', {
      updates: {
        version: summary.version,
        updateAvailable: summary.update_available,
        latest: summary.latest_release
          ? {
              version: summary.latest_release.version,
              url: summary.latest_release.url,
              publishedAt: summary.latest_release.published_at,
              notes: summary.latest_release.notes,
            }
          : null,
        checkedAt: summary.checked_at,
        dailyCheck: summary.daily_check,
        repo: summary.repo,
        strategy: summary.updates_by,
        strategyDescription: strategyDescription(summary.updates_by),
        commands: summary.commands,
        past: summary.past_updates.map((upgrade) => ({
          id: upgrade.id,
          fromVersion: upgrade.from_version,
          toVersion: upgrade.to_version,
          status: upgrade.status,
          via: upgrade.via,
          requestedBy: upgrade.requested_by,
          startedAt: upgrade.started_at,
          finishedAt: upgrade.finished_at,
          message: upgrade.message,
        })),
      },
    })
  }

  async check({ response, bouncer, session }: HttpContext) {
    await bouncer.authorize('access', 'settings:read')
    try {
      const release = await checkNow()
      if (await updateAvailable()) {
        session.flash(
          'success',
          `CMS ${release.latest_version} is out. This install runs ${await cmsVersion()}.`
        )
      } else {
        session.flash('success', `CMS ${await cmsVersion()} is the newest release.`)
      }
    } catch (error) {
      session.flash(
        'error',
        error instanceof GithubUnavailable ? error.message : 'Could not check for updates'
      )
    }
    return response.redirect().back()
  }
}
