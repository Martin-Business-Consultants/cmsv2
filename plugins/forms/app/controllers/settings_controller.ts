import type { HttpContext } from '@adonisjs/core/http'
import { audit } from '#services/audit'
import { assertValid } from '#services/fields'
import { formsSettingsValidator } from '../validators/form.js'
import {
  getFormsSettings,
  recipientList,
  settingsView,
  updateFormsSettings,
  type FormsSettings,
} from '../services/settings.js'

export default class SettingsController {
  async edit({ inertia, bouncer }: HttpContext) {
    await bouncer.authorize('access', 'settings:read')
    return inertia.render('forms/admin/settings', {
      settings: settingsView(await getFormsSettings()),
    })
  }

  async update(ctx: HttpContext) {
    const { request, response, bouncer, session } = ctx
    await bouncer.authorize('access', 'settings:write')
    const values = await request.validateUsing(formsSettingsValidator)
    const current = await getFormsSettings()

    const next: FormsSettings = {
      fromName: values.fromName ?? '',
      fromEmail: values.fromEmail ?? '',
      defaultRecipients: recipientList(values.defaultRecipients).join(', '),
      captchaProvider: values.captchaProvider,
      turnstileSiteKey: values.turnstileSiteKey ?? '',
      turnstileSecretKey: values.turnstileSecretKey || current.turnstileSecretKey,
      recaptchaSiteKey: values.recaptchaSiteKey ?? '',
      recaptchaSecretKey: values.recaptchaSecretKey || current.recaptchaSecretKey,
      spamRetentionDays: values.spamRetentionDays,
    }
    const provider = next.captchaProvider
    if (provider !== 'none') {
      const missing = []
      if (!next[`${provider}SiteKey`]) {
        missing.push({ field: `${provider}SiteKey`, message: 'Add the site key', rule: 'required' })
      }
      if (!next[`${provider}SecretKey`]) {
        missing.push({
          field: `${provider}SecretKey`,
          message: 'Add the secret key',
          rule: 'required',
        })
      }
      assertValid(missing)
    }
    const changed = (Object.keys(next) as (keyof FormsSettings)[]).filter(
      (key) => next[key] !== current[key]
    )
    await updateFormsSettings(next)
    await audit(ctx, 'settings.updated', null, { section: 'forms', changed })

    session.flash('success', 'Forms settings saved')
    return response.redirect().back()
  }
}
