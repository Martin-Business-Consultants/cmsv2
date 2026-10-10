import type { HttpContext } from '@adonisjs/core/http'
import { brandBriefValidator } from '#validators/settings'
import { saveBrandBrief } from '#services/branding'
import { audit } from '#services/audit'

export default class BrandBriefController {
  async update(ctx: HttpContext) {
    const { request, response, bouncer, session } = ctx
    await bouncer.authorize('access', 'settings:write')
    const values = await request.validateUsing(brandBriefValidator)
    const brief = await saveBrandBrief(values)
    const fieldsSet = Object.entries(brief)
      .filter(([, value]) => value)
      .map(([field]) => field)
      .sort()
    await audit(ctx, 'settings.brand_updated', null, { fields_set: fieldsSet })

    session.flash('success', 'Brand context saved')
    return response.redirect().back()
  }
}
