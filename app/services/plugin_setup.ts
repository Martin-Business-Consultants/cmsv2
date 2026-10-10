import db from '@adonisjs/lucid/services/db'
import { installBlockTypes as installBlockTypeDefinitions } from '#services/block_types'
import Role from '#models/role'
import Setting from '#models/setting'
import { plugins } from '#services/plugins'
import { builtInRoleName } from '#types/permissions'

const STATE_KEY = 'plugins'
const SETUP_KEY = 'plugin_setups'

async function readSetting(key: string) {
  const row = await Setting.findBy('key', key)
  return (row?.value ?? {}) as Record<string, boolean>
}

export async function loadPluginState() {
  try {
    plugins.setState(await readSetting(STATE_KEY))
  } catch {
    plugins.setState({})
  }
}

async function grantDefaults(key: string) {
  for (const group of plugins.permissionGroups.filter((item) => item.plugin === key)) {
    for (const [name, capabilities] of Object.entries(group.defaults ?? {})) {
      const role = await Role.findBy('name', builtInRoleName(name))
      if (!role || role.isAdmin) continue
      const owned = group.capabilities.some((capability) => role.permissions.includes(capability))
      if (owned) continue
      role.permissions = [...new Set([...role.permissions, ...(capabilities ?? [])])]
      await role.save()
    }
  }
}

async function installBlockTypes(key: string) {
  for (const pack of plugins.blockTypePacks.filter((item) => item.plugin === key)) {
    await installBlockTypeDefinitions(pack.types)
  }
}

export async function setUpPlugin(key: string) {
  const setups = await readSetting(SETUP_KEY)
  if (setups[key]) return false
  await installBlockTypes(key)
  await grantDefaults(key)
  for (const { task } of plugins.bootstraps.filter((item) => item.plugin === key)) await task()
  await Setting.updateOrCreate(
    { key: SETUP_KEY },
    { key: SETUP_KEY, value: { ...setups, [key]: true } }
  )
  return true
}

export async function switchPlugin(key: string, on: boolean) {
  const state = await readSetting(STATE_KEY)
  await Setting.updateOrCreate(
    { key: STATE_KEY },
    { key: STATE_KEY, value: { ...state, [key]: on } }
  )
  await loadPluginState()
  if (on && plugins.isEnabled(key)) return setUpPlugin(key)
  return false
}

export async function settlePlugins() {
  await loadPluginState()
  const hasSettings = await db.connection().schema.hasTable('settings')
  if (!hasSettings) return
  for (const key of plugins.definitions.keys()) {
    if (plugins.isEnabled(key)) await setUpPlugin(key)
  }
}
