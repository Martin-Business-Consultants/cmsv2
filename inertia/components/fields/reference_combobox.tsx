import { useEffect, useState } from 'react'
import { Check, ChevronsUpDown, X } from 'lucide-react'
import { Button } from '~/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '~/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'
import { useLookup } from '~/hooks/use_lookup'
import { getJson } from '~/lib/http'
import { cn } from '~/lib/utils'

type Option = { id: number }

export default function ReferenceCombobox<T extends Option>({
  url,
  params = {},
  value,
  onChange,
  onPick,
  label,
  detail,
  placeholder = 'Choose…',
}: {
  url: string
  params?: Record<string, unknown>
  value: number | null
  onChange: (value: number | null) => void
  onPick?: (option: T) => void
  label: (option: T) => string
  detail?: (option: T) => string
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [fetched, setFetched] = useState<T | null>(null)
  const { data, loading } = useLookup<T>(open ? url : null, { ...params, search })
  const query = JSON.stringify(params)
  const selected = fetched?.id === value ? fetched : null
  const missing = value && fetched?.id !== value ? value : null

  useEffect(() => {
    if (!missing) return
    let cancelled = false
    getJson<{ data: T[] }>(url, { ...JSON.parse(query), ids: missing }).then(
      (response) => !cancelled && setFetched(response.data[0] ?? null)
    )
    return () => {
      cancelled = true
    }
  }, [url, query, missing])

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" className="flex-1 justify-between font-normal">
            <span className={cn('truncate', !selected && 'text-muted-foreground')}>
              {selected ? label(selected) : value ? `#${value}` : placeholder}
            </span>
            <ChevronsUpDown className="opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] min-w-72 p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput placeholder="Search…" value={search} onValueChange={setSearch} />
            <CommandList>
              <CommandEmpty>{loading ? 'Loading…' : 'Nothing found.'}</CommandEmpty>
              <CommandGroup>
                {data.map((option) => (
                  <CommandItem
                    key={option.id}
                    value={String(option.id)}
                    onSelect={() => {
                      setFetched(option)
                      onPick?.(option)
                      onChange(option.id)
                      setOpen(false)
                    }}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate">{label(option)}</div>
                      {detail && (
                        <div className="text-muted-foreground truncate text-xs">
                          {detail(option)}
                        </div>
                      )}
                    </div>
                    <Check className={cn(value === option.id ? 'opacity-100' : 'opacity-0')} />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {value && (
        <Button type="button" variant="ghost" size="icon" onClick={() => onChange(null)}>
          <X />
        </Button>
      )}
    </div>
  )
}
