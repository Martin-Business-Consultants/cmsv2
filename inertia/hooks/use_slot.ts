import { usePage } from '@inertiajs/react'
import { pluginSlots } from '~/lib/plugin_components'

export function useEnabledPlugins() {
  const { plugins } = usePage().props
  return new Set(plugins ?? [])
}

export function useSlot(name: string) {
  const enabled = useEnabledPlugins()
  const key = Object.keys(pluginSlots).find(
    (slot) => slot.endsWith(`/${name}`) && enabled.has(slot.split('/')[0])
  )
  return key ? pluginSlots[key] : null
}
