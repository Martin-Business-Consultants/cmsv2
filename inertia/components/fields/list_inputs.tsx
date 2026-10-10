import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import type { EntryOption, Field } from '#types/content'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import ReferenceCombobox from '~/components/fields/reference_combobox'
import SortableRows from '~/components/fields/sortable_rows'
import { getJson } from '~/lib/http'
import { urlFor } from '~/client'

export function StringListInput({
  id,
  value,
  onChange,
}: {
  id: string
  value: string[]
  onChange: (value: string[]) => void
}) {
  const [draft, setDraft] = useState('')

  function add(text: string) {
    const lines = text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
    if (!lines.length) return
    onChange([...value, ...lines])
    setDraft('')
  }

  return (
    <div className="grid gap-2" data-list-input>
      <SortableRows
        items={value}
        onChange={onChange}
        label="item"
        rowKey={(_, index) => String(index)}
        render={(item, index) => (
          <Input
            aria-label={`Item ${index + 1}`}
            className="h-8 border-0 shadow-none focus-visible:ring-1"
            value={item}
            onChange={(event) =>
              onChange(value.map((current, i) => (i === index ? event.target.value : current)))
            }
          />
        )}
      />
      <div className="flex gap-2">
        <Input
          id={id}
          value={draft}
          placeholder="Add an item and press Enter"
          onChange={(event) => setDraft(event.target.value)}
          onPaste={(event) => {
            const text = event.clipboardData.getData('text')
            if (!text.includes('\n')) return
            event.preventDefault()
            add(`${draft}${text}`)
          }}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return
            event.preventDefault()
            add(draft)
          }}
        />
        <Button type="button" variant="outline" disabled={!draft.trim()} onClick={() => add(draft)}>
          <Plus />
          Add
        </Button>
      </div>
      <p className="text-muted-foreground text-xs">
        Paste several lines to add one item per line. Drag the handles to reorder.
      </p>
    </div>
  )
}

export function RecordRefsInput({
  field,
  value,
  onChange,
}: {
  field: Field
  value: number[]
  onChange: (value: number[]) => void
}) {
  const [known, setKnown] = useState<Record<number, EntryOption>>({})
  const missing = value.filter((id) => !known[id]).join(',')

  useEffect(() => {
    if (!missing) return
    let cancelled = false
    getJson<{ data: EntryOption[] }>(urlFor('admin.lookups.entries'), { ids: missing }).then(
      (response) => {
        if (cancelled) return
        setKnown((current) => ({
          ...current,
          ...Object.fromEntries(response.data.map((entry) => [entry.id, entry])),
        }))
      }
    )
    return () => {
      cancelled = true
    }
  }, [missing])

  return (
    <div className="grid gap-2" data-list-input>
      <SortableRows
        items={value}
        onChange={onChange}
        label="entry"
        rowKey={(id) => String(id)}
        render={(id) => {
          const entry = known[id]
          return (
            <div className="flex min-w-0 items-baseline gap-2 px-1 text-sm">
              <span className="truncate font-medium">{entry?.title ?? `#${id}`}</span>
              {entry && !field.collection && (
                <span className="text-muted-foreground truncate text-xs">
                  {entry.collectionName}
                </span>
              )}
            </div>
          )
        }}
      />
      <ReferenceCombobox<EntryOption>
        url={urlFor('admin.lookups.entries')}
        params={{ collection: field.collection }}
        value={null}
        onChange={(id) => {
          if (id && !value.includes(id)) onChange([...value, id])
        }}
        onPick={(entry) => setKnown((current) => ({ ...current, [entry.id]: entry }))}
        label={(entry) => entry.title}
        detail={(entry) => entry.collectionName}
        placeholder="Add an entry…"
      />
    </div>
  )
}
