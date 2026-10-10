import type { HttpContext } from '@adonisjs/core/http'
import { brandingValidator } from '#validators/settings'
import { getSettings, updateSettings } from '#services/settings'
import { getBrandBrief, getBranding, saveBranding } from '#services/branding'
import { plugins } from '#services/plugins'
import { audit } from '#services/audit'

export default class BrandingController {
  async edit({ inertia, auth }: HttpContext) {
    const user = auth.use('web').getUserOrFail()
    const workspace = user.can('settings:read')
    const settings = workspace ? await getSettings() : null

    return inertia.render('admin/settings/branding', {
      workspace,
      mediaLibrary: plugins.provided('media') !== null,
      branding: workspace
        ? {
            ...(await getBranding()),
            logoAssetId: settings!.logoAssetId,
            faviconAssetId: settings!.faviconAssetId,
          }
        : null,
      brief: workspace ? await getBrandBrief() : null,
    })
  }

  async update(ctx: HttpContext) {
    const { request, response, bouncer, session } = ctx
    await bouncer.authorize('access', 'settings:write')
    const values = await request.validateUsing(brandingValidator)

    await updateSettings({
      logoAssetId: values.logoAssetId ?? null,
      faviconAssetId: values.faviconAssetId ?? null,
    })
    const branding = await saveBranding({
      primaryColor: values.primaryColor ?? null,
      secondaryColor: values.secondaryColor ?? null,
      font: values.font ?? null,
      borderRadius: values.borderRadius ?? null,
      boxShadow: values.boxShadow ?? null,
      defaultAppearance: values.defaultAppearance ?? 'system',
    })
    const keys = Object.entries({
      ...branding,
      logoAssetId: values.logoAssetId,
      faviconAssetId: values.faviconAssetId,
    })
      .filter(([, value]) => value !== null && value !== undefined && value !== '')
      .map(([key]) => key)
      .sort()
    await audit(ctx, 'settings.branding_updated', null, { keys })

    session.flash('success', 'Branding saved')
    return response.redirect().back()
  }
}
