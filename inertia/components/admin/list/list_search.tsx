import { useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '~/components/ui/input'
import { cn } from '~/lib/utils'
import { useListUrl } from './query'

export default function ListSearch({
  value,
  placeholder = 'Search…',
  param = 'search',
  className,
}: {
  value: string
  placeholder?: string
  param?: string
  className?: string
}) {
  const { visit } = useListUrl()
  const [text, setText] = useState(value)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const latest = useRef(value)

  useEffect(() => {
    if (value !== latest.current) {
      latest.current = value
      setText(value)
    }
  }, [value])

  useEffect(() => () => clearTimeout(timer.current), [])

  function submit(next: string) {
    clearTimeout(timer.current)
    if (next.trim() === latest.current) return
    latest.current = next.trim()
    visit({ [param]: next.trim() })
  }

  function change(next: string) {
    setText(next)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => submit(next), 300)
  }

  return (
    <form
      role="search"
      className={cn('relative w-full sm:w-64', className)}
      onSubmit={(event) => {
        event.preventDefault()
        submit(text)
      }}
    >
      <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
      <Input
        type="search"
        data-list-search
        aria-label={placeholder.replace(/…$/, '')}
        className="h-8 pr-8 pl-8 [&::-webkit-search-cancel-button]:hidden"
        placeholder={placeholder}
        value={text}
        onChange={(event) => change(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== 'Escape') return
          event.preventDefault()
          if (text) {
            setText('')
            submit('')
          } else {
            event.currentTarget.blur()
          }
        }}
      />
      {text && (
        <button
          type="button"
          aria-label="Clear search"
          className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2"
          onClick={() => {
            setText('')
            submit('')
          }}
        >
          <X className="size-4" />
        </button>
      )}
    </form>
  )
}
