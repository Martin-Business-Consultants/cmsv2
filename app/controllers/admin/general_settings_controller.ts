import type { HttpContext } from '@adonisjs/core/http'
import Page from '#models/page'
import { generalSettingsValidator } from '#validators/settings'
import {
  SERVER_TIME_ZONE,
  getSettings,
  isTimeZone,
  originOf,
  updateSettings,
  type SiteSettings,
} from '#services/settings'
import { forgetBranding } from '#services/branding'
import { timeZoneOptions } from '#services/time_zones'
import { audit } from '#services/audit'

function splitOrigins(raw: string | null | undefined) {
  return [
    ...new Set(
      (raw ?? '')
        .split(/[\n,]/)
        .map((value) => value.trim())
        .filter(Boolean)
        .map((value) => originOf(value) ?? value)
    ),
  ]
}

function same(a: unknown, b: unknown) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null)
}

export default class GeneralSettingsController {
  async edit({ inertia, bouncer }: HttpContext) {
    await bouncer.authorize('access', 'settings:read')
    const settings = await getSettings()
    const pages = await Page.query().whereNull('deleted_at').orderBy('path')

    return inertia.render('admin/settings/general', {
      settings,
      serverTimeZone: SERVER_TIME_ZONE,
      timeZones: timeZoneOptions(settings.timezone),
      pages: pages.map((page) => ({ id: page.id, title: page.title, path: page.path })),
    })
  }

  async update(ctx: HttpContext) {
    const { request, response, bouncer, session } = ctx
    await bouncer.authorize('access', 'settings:write')
    const values = await request.validateUsing(generalSettingsValidator)
    const current = await getSettings()
    const timezone = values.timezone ?? ''

    const next: Partial<SiteSettings> = {
      siteName: values.siteName,
      tagline: values.tagline ?? '',
      defaultLocale: values.defaultLocale || 'en',
      timezone: timezone && !isTimeZone(timezone) ? current.timezone : timezone,
      siteBaseUrl: (values.siteBaseUrl ?? '').replace(/\/+$/, ''),
      publicOrigins: splitOrigins(values.publicOrigins),
      contactEmail: values.contactEmail ?? '',
      phone: values.phone ?? '',
      addressLine1: values.addressLine1 ?? '',
      city: values.city ?? '',
      state: values.state ?? '',
      zip: values.zip ?? '',
      emailFromName: values.emailFromName ?? '',
      emailFromAddress: values.emailFromAddress ?? '',
      homePageId: values.homePageId ?? null,
      headScripts: values.headScripts ?? '',
    }
    const fields = (Object.keys(next) as (keyof SiteSettings)[]).filter(
      (key) => !same(next[key], current[key])
    )
    await updateSettings(next)
    forgetBranding()
    if (fields.length) await audit(ctx, 'settings.general_updated', null, { fields })

    session.flash('success', 'General settings saved')
    return response.redirect().back()
  }
}
