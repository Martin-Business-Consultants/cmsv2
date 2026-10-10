import { useEffect, useState } from 'react'
import { router } from '@inertiajs/react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { cn } from '~/lib/utils'
import { urlFor } from '~/client'

export type BoardField = { name: string; label: string; type: string; options: string[] }

const BLANK = '__blank__'

function save(url: string, field: string, value: unknown) {
  router.put(url, { field, value } as never, { preserveScroll: true, preserveState: true })
}

export function OnOff({ on, className }: { on: boolean; className?: string }) {
  return (
    <>
      <span
        aria-hidden
        className={cn(
          'size-2 shrink-0 rounded-full',
          on ? 'bg-emerald-500' : 'bg-muted-foreground/30',
          className
        )}
      />
      {on ? 'On' : 'Off'}
    </>
  )
}

function TextControl({
  field,
  value,
  onCommit,
}: {
  field: BoardField
  value: string
  onCommit: (value: string) => void
}) {
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])
  const commit = () => {
    if (draft !== value) onCommit(draft)
  }

  return (
    <Input
      type={field.type === 'datetime' ? 'datetime-local' : 'text'}
      inputMode={field.type === 'integer' ? 'numeric' : undefined}
      autoComplete="off"
      aria-label={field.label}
      placeholder={field.label}
      value={draft}
      className="h-8 min-w-0 flex-1 text-sm"
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          commit()
        } else if (event.key === 'Escape') {
          setDraft(value)
          event.currentTarget.blur()
        }
      }}
    />
  )
}

export default function CardField({
  collectionId,
  entryId,
  field,
  value,
  disabled,
}: {
  collectionId: number
  entryId: number
  field: BoardField
  value: string | boolean
  disabled?: boolean
}) {
  const url = urlFor('admin.entry_boards.card_field', { collectionId, id: entryId })
  const commit = (next: unknown) => save(url, field.name, next)

  let control
  if (field.type === 'boolean') {
    const on = value === true
    control = (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mr-auto h-7 gap-1.5 px-2 text-xs"
        aria-pressed={on}
        title={field.label}
        disabled={disabled}
        onClick={() => commit(!on)}
      >
        <OnOff on={on} />
      </Button>
    )
  } else if (field.type === 'select') {
    control = (
      <Select
        value={value ? String(value) : BLANK}
        disabled={disabled}
        onValueChange={(next) => commit(next === BLANK ? '' : next)}
      >
        <SelectTrigger size="sm" className="h-8 min-w-0 flex-1" aria-label={field.label}>
          <SelectValue placeholder={field.label} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={BLANK}>
            <span className="text-muted-foreground">{field.label}</span>
          </SelectItem>
          {field.options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  } else if (disabled) {
    control = <span className="min-w-0 flex-1 truncate text-sm">{String(value) || '—'}</span>
  } else {
    control = <TextControl field={field} value={String(value ?? '')} onCommit={commit} />
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground w-24 shrink-0 truncate text-xs" aria-hidden>
        {field.label}
      </span>
      {control}
    </div>
  )
}
