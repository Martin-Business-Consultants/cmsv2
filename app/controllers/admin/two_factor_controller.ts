import type { HttpContext } from '@adonisjs/core/http'
import { errors } from '@vinejs/vine'
import { totpCodeValidator } from '#validators/account'
import { audit } from '#services/audit'

export default class TwoFactorController {
  async store(ctx: HttpContext) {
    const { request, response, auth, session } = ctx
    const user = auth.use('web').user!
    if (user.totpEnabled) return response.redirect().back()
    const { code } = await request.validateUsing(totpCodeValidator)
    const codes = await user.enableTotp(code)
    if (!codes) {
      throw new errors.E_VALIDATION_ERROR([
        {
          field: 'code',
          message: 'That code is not valid. Check the time on your device and try again.',
          rule: 'totp',
        },
      ])
    }
    await audit(ctx, 'two_factor.enabled', user)
    session.flash('recoveryCodes', codes)
    session.flash('success', 'Two-factor authentication enabled')
    return response.redirect().back()
  }

  async regenerate(ctx: HttpContext) {
    const { response, auth, session } = ctx
    const user = auth.use('web').user!
    if (!user.totpEnabled) return response.redirect().back()
    const codes = await user.regenerateRecoveryCodes()
    await audit(ctx, 'two_factor.recovery_codes_regenerated', user)
    session.flash('recoveryCodes', codes)
    session.flash('success', 'New recovery codes generated. The old ones no longer work.')
    return response.redirect().back()
  }

  async destroy(ctx: HttpContext) {
    const { response, auth, session } = ctx
    const user = auth.use('web').user!
    if (user.totpEnabled) {
      await user.disableTotp()
      await audit(ctx, 'two_factor.disabled', user)
    }
    session.flash('success', 'Two-factor authentication disabled')
    return response.redirect().back()
  }
}
