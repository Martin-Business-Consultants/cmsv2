import { useCallback, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Checkbox } from '~/components/ui/checkbox'
import { Label } from '~/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'

export type ScreenColumn = { id: string; label: string; primary?: boolean; hidden?: boolean }

export type Screen = {
  name: string
  columns: ScreenColumn[]
  isVisible: (id: string) => boolean
  toggle: (id: string) => void
}

function storageKey(name: string) {
  return `screen-options:${name}`
}

function readHidden(name: string, columns: ScreenColumn[]) {
  const fallback = columns.filter((column) => column.hidden).map((column) => column.id)
  if (typeof window === 'undefined') return fallback
  try {
    const stored = window.localStorage.getItem(storageKey(name))
    const parsed = stored ? JSON.parse(stored) : null
    return Array.isArray(parsed) ? parsed.map(String) : fallback
  } catch {
    return fallback
  }
}

export function useScreenOptions(name: string, columns: ScreenColumn[]): Screen {
  const [hidden, setHidden] = useState<string[]>(() => readHidden(name, columns))

  const toggle = useCallback(
    (id: string) =>
      setHidden((current) => {
        const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
        try {
          window.localStorage.setItem(storageKey(name), JSON.stringify(next))
        } catch {
          return next
        }
        return next
      }),
    [name]
  )

  return {
    name,
    columns,
    isVisible: (id) =>
      columns.find((column) => column.id === id)?.primary === true || !hidden.includes(id),
    toggle,
  }
}

export default function ScreenOptions({ screen }: { screen: Screen }) {
  const choices = screen.columns.filter((column) => !column.primary)
  if (!choices.length) return null

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="text-muted-foreground" data-screen-options>
          Screen options
          <ChevronDown />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <fieldset>
          <legend className="text-sm font-medium">Columns</legend>
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5">
            {choices.map((column) => {
              const id = `screen-${screen.name}-${column.id}`
              return (
                <div key={column.id} className="flex items-center gap-2">
                  <Checkbox
                    id={id}
                    checked={screen.isVisible(column.id)}
                    onCheckedChange={() => screen.toggle(column.id)}
                  />
                  <Label htmlFor={id} className="font-normal">
                    {column.label}
                  </Label>
                </div>
              )
            })}
          </div>
        </fieldset>
      </PopoverContent>
    </Popover>
  )
}
