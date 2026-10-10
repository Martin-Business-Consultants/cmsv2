import type { HttpContext } from '@adonisjs/core/http'
import { errors } from '@vinejs/vine'
import { languagesValidator } from '#validators/taxonomy'
import { localeCounts, normalizeLocale, saveLocales, siteLocales } from '#services/locales'
import { audit } from '#services/audit'

export default class LanguagesSettingsController {
  async edit({ inertia, bouncer }: HttpContext) {
    await bouncer.authorize('access', 'settings:read')
    const [site, counts] = await Promise.all([siteLocales(), localeCounts()])
    return inertia.render('admin/settings/languages', { ...site, counts })
  }

  async update(ctx: HttpContext) {
    const { request, response, bouncer, session } = ctx
    await bouncer.authorize('access', 'settings:write')
    const values = await request.validateUsing(languagesValidator)
    const before = await siteLocales()
    const next = [...new Set(values.locales.map(normalizeLocale))]
    const removed = before.locales.filter(
      (locale) => locale !== before.defaultLocale && !next.includes(locale)
    )
    const counts = await localeCounts()
    const inUse = removed.find((locale) => counts.pages[locale] || counts.entries[locale])
    if (inUse) {
      const pages = counts.pages[inUse] ?? 0
      const entries = counts.entries[inUse] ?? 0
      throw new errors.E_VALIDATION_ERROR([
        {
          field: 'locales',
          message: `"${inUse}" is still used by ${pages} ${pages === 1 ? 'page' : 'pages'} and ${entries} ${entries === 1 ? 'entry' : 'entries'}. Move or trash them first.`,
          rule: 'inUse',
        },
      ])
    }
    const after = await saveLocales(next)
    if (after.locales.join() !== before.locales.join()) {
      await audit(ctx, 'settings.languages_updated', null, { locales: after.locales })
    }
    session.flash('success', 'Languages saved')
    return response.redirect().back()
  }
}
