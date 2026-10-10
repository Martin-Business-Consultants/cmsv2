import { usePage } from '@inertiajs/react'

export function useCan() {
  const { user } = usePage().props
  const capabilities = new Set(user?.capabilities ?? [])
  return (capability: string) => capabilities.has(capability)
}
