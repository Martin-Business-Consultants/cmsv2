import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import { plugins } from '#services/plugins'
import { switchPlugin } from '#services/plugin_setup'
import { audit } from '#services/audit'

const updateValidator = vine.create({ enabled: vine.boolean() })

function contributions(key: string) {
  const own = <T extends { plugin: string }>(list: T[]) =>
    list.filter((item) => item.plugin === key)
  return [
    ...own(plugins.menus).map((item) => `Menu: ${item.label}`),
    ...own(plugins.settingsPages).map((item) => `Settings: ${item.label}`),
    ...own(plugins.permissionGroups).map((item) => `Permissions: ${item.group}`),
    ...own(plugins.blockTypePacks).flatMap((pack) =>
      pack.types.map((type) => `Block: ${type.label}`)
    ),
    ...own(plugins.fieldTypes).map((item) => `Field type: ${item.label}`),
    ...own(plugins.widgets).map((item) => `Dashboard: ${item.title}`),
    ...own(plugins.endpoints).map((item) => `API: ${item.path}`),
  ]
}

export default class PluginsController {
  async index({ inertia, bouncer }: HttpContext) {
    await bouncer.authorize('access', 'settings:read')
    const list = [...plugins.definitions.values()].map((definition) => ({
      key: definition.key,
      name: definition.name,
      version: definition.version,
      description: definition.description,
      author: definition.author ?? null,
      homepage: definition.homepage ?? null,
      dependsOn: definition.dependsOn ?? [],
      switchedOn: plugins.isSwitchedOn(definition.key),
      enabled: plugins.isEnabled(definition.key),
      missing: plugins.missingDependencies(definition.key),
      contributions: contributions(definition.key),
    }))
    return inertia.render('admin/plugins/index', { installed: list })
  }

  async update(ctx: HttpContext) {
    const { params, request, response, bouncer, session } = ctx
    await bouncer.authorize('access', 'settings:write')
    const definition = plugins.definitions.get(params.key)
    if (!definition) return response.notFound()
    const { enabled } = await request.validateUsing(updateValidator)

    await switchPlugin(definition.key, enabled)
    await audit(ctx, enabled ? 'plugin.activated' : 'plugin.deactivated', null, {
      plugin: definition.key,
    })

    const waiting = enabled && !plugins.isEnabled(definition.key)
    session.flash(
      'success',
      waiting
        ? `${definition.name} is on, waiting for ${plugins.missingDependencies(definition.key).join(', ')}`
        : `${definition.name} ${enabled ? 'activated' : 'deactivated'}`
    )
    return response.redirect().back()
  }
}
