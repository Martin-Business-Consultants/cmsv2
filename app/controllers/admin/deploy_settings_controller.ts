import type { HttpContext } from '@adonisjs/core/http'
import { deploySettingsValidator } from '#validators/deploy'
import {
  configure,
  deployConfig,
  deploySummary,
  isPaused,
  isReady,
  providerFor,
  providers,
  triggerDeploy,
} from '#services/deploys'
import * as frontend from '#services/frontend'
import { mergeSetting } from '#services/settings'
import { secretHint, setSecrets } from '#services/secrets'
import { parseOutboundUrl, OutboundUrlError } from '#services/outbound_url'
import { assertValid } from '#services/fields'
import { audit } from '#services/audit'

function recentlyScheduled(scheduledAt: string | null) {
  if (!scheduledAt) return false
  const at = Date.parse(scheduledAt)
  return Number.isFinite(at) && at > Date.now() - 90_000
}

export default class DeploySettingsController {
  async show({ inertia, bouncer, auth }: HttpContext) {
    await bouncer.authorize('access', 'settings:read')
    const user = auth.use('web').getUserOrFail()
    const writable = user.can('settings:write')
    const config = await deployConfig()
    const summary = await deploySummary()
    const current = providerFor(config)
    const purgeUrl = await frontend.purgeUrl()

    return inertia.render('admin/settings/deploy', {
      deploy: {
        provider: current.key,
        url: writable ? (config.url ?? '') : '',
        urlHost: summary.url_host,
        paused: isPaused(config),
        ready: summary.ready,
        target: await current.target(config),
        configured: await current.configured(config),
        scheduled: recentlyScheduled(summary.scheduled_at),
        lastReason: summary.last_reason,
        lastStatus: summary.last_status,
        log: summary.log,
      },
      providers: providers().map((provider) => ({ key: provider.key, label: provider.label })),
      github: {
        repo: (await frontend.githubRepo()) ?? '',
        tokenHint: secretHint(await frontend.githubToken()),
      },
      site: {
        siteUrl: await frontend.siteUrl(),
        lastBuild: await frontend.lastBuild(),
        render: await frontend.render(),
        purgeUrl,
        pending: await frontend.pendingDelivery(),
        secretMasked: purgeUrl ? '•'.repeat(24) : null,
      },
    })
  }

  async update(ctx: HttpContext) {
    const { request, response, bouncer, session } = ctx
    await bouncer.authorize('access', 'settings:write')
    const values = await request.validateUsing(deploySettingsValidator)
    const url = values.url ?? ''
    if (url) {
      try {
        parseOutboundUrl(url)
      } catch (error) {
        const message = error instanceof OutboundUrlError ? error.message : 'URL is not valid'
        assertValid([{ field: 'url', message, rule: 'url' }])
      }
    }
    await configure({ provider: values.provider, url, paused: values.paused ?? false }, ctx)
    if (values.githubRepo !== undefined) {
      await mergeSetting(frontend.GITHUB_SETTING, { frontend_github_repo: values.githubRepo ?? '' })
    }
    if (values.githubToken) {
      await setSecrets(frontend.GITHUB_SETTING, { token: values.githubToken })
      await audit(ctx, 'settings.github_updated', null, { token_changed: true })
    }
    session.flash('success', 'Deploy settings saved')
    return response.redirect().back()
  }

  async trigger(ctx: HttpContext) {
    const { response, bouncer, session } = ctx
    await bouncer.authorize('access', 'settings:write')
    const config = await deployConfig()
    if (!(await isReady(config))) {
      await audit(ctx, 'settings.deploy_triggered', null, { outcome: 'not_configured' })
      session.flash('error', 'Set up a deploy provider first')
    } else if (isPaused(config)) {
      await audit(ctx, 'settings.deploy_triggered', null, { outcome: 'paused' })
      session.flash('error', 'Deploys are paused — resume them before deploying')
    } else {
      await triggerDeploy()
      await audit(ctx, 'settings.deploy_triggered')
      session.flash('success', 'Deploy triggered')
    }
    return response.redirect().back()
  }

  async approveDelivery(ctx: HttpContext) {
    const { response, bouncer, session } = ctx
    await bouncer.authorize('access', 'settings:write')
    if (await frontend.approveDelivery(ctx)) {
      session.flash('success', 'Publishing now follows what the site reported')
    } else {
      session.flash('error', 'Nothing is waiting for approval')
    }
    return response.redirect().back()
  }

  async revealPurgeSecret(ctx: HttpContext) {
    await ctx.bouncer.authorize('access', 'settings:write')
    const secret = await frontend.purgeSecret()
    await audit(ctx, 'settings.purge_secret_revealed')
    return { token: secret }
  }

  async rotatePurgeSecret(ctx: HttpContext) {
    const { response, bouncer, session } = ctx
    await bouncer.authorize('access', 'settings:write')
    await frontend.rotatePurgeSecret()
    await audit(ctx, 'settings.purge_secret_rotated')
    session.flash('success', 'Purge secret rotated — give the site the new one')
    return response.redirect().back()
  }
}
