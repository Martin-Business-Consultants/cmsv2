import type { ComponentType } from 'react'

type Module = { default: ComponentType<any> }

function collect(modules: Record<string, Module>, withPlugin = false) {
  return Object.fromEntries(
    Object.entries(modules).map(([path, module]) => {
      const [, plugin, rest] = path.match(/plugins\/([^/]+)\/inertia\/[^/]+\/(.+)\.tsx$/) ?? []
      return [withPlugin ? `${plugin}/${rest}` : rest, module.default]
    })
  ) as Record<string, ComponentType<any>>
}

export const pluginBlocks = collect(
  import.meta.glob<Module>('../../plugins/*/inertia/blocks/*.tsx', { eager: true })
)

export const pluginFields = collect(
  import.meta.glob<Module>('../../plugins/*/inertia/fields/*.tsx', { eager: true })
)

export const pluginWidgets = collect(
  import.meta.glob<Module>('../../plugins/*/inertia/widgets/*.tsx', { eager: true }),
  true
)

export const pluginSlots = collect(
  import.meta.glob<Module>('../../plugins/*/inertia/slots/*.tsx', { eager: true }),
  true
)
