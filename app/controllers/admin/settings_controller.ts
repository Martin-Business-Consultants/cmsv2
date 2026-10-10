import { readFile } from 'node:fs/promises'
import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import { settingsSections } from '#services/admin_menu'
import GeneralSettingsController from '#controllers/admin/general_settings_controller'

let version: string | null = null

async function cmsVersion() {
  if (version) return version
  try {
    const pkg = JSON.parse(await readFile(app.makePath('package.json'), 'utf8'))
    version = String(pkg.version ?? '0.0.0')
  } catch {
    version = '0.0.0'
  }
  return version
}

export default class SettingsController {
  async edit({ inertia, auth }: HttpContext) {
    const user = auth.use('web').getUserOrFail()
    return inertia.render('admin/settings/index', {
      version: await cmsVersion(),
      groups: settingsSections(user),
    })
  }

  async update(ctx: HttpContext) {
    return new GeneralSettingsController().update(ctx)
  }
}
