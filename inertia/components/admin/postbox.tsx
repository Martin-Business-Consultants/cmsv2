import { useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '~/lib/utils'

const STORAGE_KEY = 'postboxes-closed'

function readClosed(): string[] {
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

function remember(id: string, open: boolean) {
  try {
    const closed = readClosed().filter((item) => item !== id)
    if (!open) closed.push(id)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(closed))
  } catch {}
}

export default function Postbox({
  id,
  title,
  actions,
  flush,
  footer,
  className,
  children,
}: {
  id: string
  title: ReactNode
  actions?: ReactNode
  flush?: boolean
  footer?: ReactNode
  className?: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(() => !readClosed().includes(id))

  function toggle() {
    setOpen((value) => {
      remember(id, !value)
      return !value
    })
  }

  return (
    <section
      data-postbox={id}
      className={cn('bg-card text-card-foreground rounded-xl border shadow-sm', className)}
    >
      <div className={cn('flex items-center gap-2 px-4 py-3', open && 'border-b')}>
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left"
        >
          <h2 className="truncate text-sm font-semibold">{title}</h2>
          <ChevronDown
            className={cn(
              'text-muted-foreground size-4 shrink-0 transition-transform',
              !open && '-rotate-90'
            )}
          />
        </button>
        {actions}
      </div>
      <div hidden={!open}>
        <div className={cn(!flush && 'grid gap-4 p-4')}>{children}</div>
        {footer}
      </div>
    </section>
  )
}
