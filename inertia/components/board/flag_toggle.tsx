import { useEffect, useState } from 'react'
import { router } from '@inertiajs/react'
import { cn } from '~/lib/utils'
import { urlFor } from '~/client'

export default function FlagToggle({
  collectionId,
  entryId,
  entryTitle,
  field,
  on,
  canWrite,
}: {
  collectionId: number
  entryId: number
  entryTitle: string
  field: { name: string; label: string }
  on: boolean
  canWrite: boolean
}) {
  const [value, setValue] = useState(on)
  const [busy, setBusy] = useState(false)
  useEffect(() => setValue(on), [on])

  if (!canWrite) return <span className="text-sm">{on ? 'On' : 'Off'}</span>

  return (
    <button
      type="button"
      aria-pressed={value}
      title={`${field.label} for ${entryTitle}`}
      disabled={busy}
      onClick={() => {
        const next = !value
        setValue(next)
        router.put(
          urlFor('admin.entry_boards.flag', { collectionId, id: entryId }),
          { field: field.name, value: next },
          {
            preserveScroll: true,
            preserveState: true,
            onStart: () => setBusy(true),
            onFinish: () => setBusy(false),
            onError: () => setValue(!next),
          }
        )
      }}
      className={cn(
        'inline-flex h-6 items-center justify-center rounded-md border px-2 text-xs font-medium transition-colors disabled:opacity-70',
        value
          ? 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-200'
          : 'bg-background text-muted-foreground hover:bg-muted'
      )}
    >
      {value ? 'On' : 'Off'}
    </button>
  )
}
