import type { KeyboardEvent } from 'react'
import { usePage } from '@inertiajs/react'
import { DateTime } from 'luxon'
import { Input } from '~/components/ui/input'

const LOCAL_FORMAT = "yyyy-LL-dd'T'HH:mm:ss"

export function useSiteTimeZone() {
  const admin = usePage().props.admin as { timezone?: string } | null | undefined
  const browser = Intl.DateTimeFormat().resolvedOptions().timeZone
  const zone = admin?.timezone
  return zone && DateTime.now().setZone(zone).isValid ? zone : browser
}

export function isoToZoned(value: unknown, zone: string) {
  if (typeof value !== 'string' || !value) return ''
  const date = DateTime.fromISO(value, { setZone: true })
  return date.isValid ? date.setZone(zone).toFormat(LOCAL_FORMAT) : ''
}

export function zonedToIso(local: string, zone: string) {
  if (!local) return null
  const date = DateTime.fromISO(local, { zone })
  return date.isValid ? date.toUTC().toISO({ suppressMilliseconds: true }) : null
}

export default function DateTimeInput({
  id,
  value,
  onChange,
}: {
  id: string
  value: unknown
  onChange: (value: string | null) => void
}) {
  const zone = useSiteTimeZone()
  const local = isoToZoned(value, zone)

  function shift(days: number) {
    const base = local ? DateTime.fromISO(local, { zone }) : DateTime.now().setZone(zone)
    onChange(base.plus({ days }).toUTC().toISO({ suppressMilliseconds: true }))
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.metaKey || event.ctrlKey || event.altKey) return
    switch (event.key) {
      case 't':
      case 'T': {
        const now = DateTime.now().setZone(zone)
        const current = local ? DateTime.fromISO(local, { zone }) : now.startOf('minute')
        const today = current.set({ year: now.year, month: now.month, day: now.day })
        onChange(today.toUTC().toISO({ suppressMilliseconds: true }))
        break
      }
      case '+':
      case '=':
        shift(1)
        break
      case '-':
      case '_':
        shift(-1)
        break
      default:
        return
    }
    event.preventDefault()
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        id={id}
        type="datetime-local"
        step={1}
        className="max-w-xs"
        value={local}
        title="t = today, + / - = next / previous day"
        onKeyDown={onKeyDown}
        onClick={(event) => {
          try {
            event.currentTarget.showPicker()
          } catch {}
        }}
        onChange={(event) => onChange(zonedToIso(event.target.value, zone))}
      />
      <span className="text-muted-foreground text-xs" data-time-zone>
        {zone}
      </span>
    </div>
  )
}
