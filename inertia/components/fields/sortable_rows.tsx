import { useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, GripVertical, X } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { cn } from '~/lib/utils'

export function moveItem<T>(list: T[], from: number, to: number) {
  const next = [...list]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

export default function SortableRows<T>({
  items,
  onChange,
  render,
  rowKey,
  label = 'item',
}: {
  items: T[]
  onChange: (items: T[]) => void
  render: (item: T, index: number) => ReactNode
  rowKey: (item: T, index: number) => string
  label?: string
}) {
  const [dragging, setDragging] = useState<number | null>(null)
  const [over, setOver] = useState<number | null>(null)
  const [armed, setArmed] = useState<number | null>(null)

  if (!items.length) return null

  return (
    <ol className="grid gap-1.5">
      {items.map((item, index) => (
        <li
          key={rowKey(item, index)}
          data-sortable-row
          draggable={armed === index}
          onDragStart={(event) => {
            setDragging(index)
            event.dataTransfer.effectAllowed = 'move'
            event.dataTransfer.setData('text/plain', String(index))
          }}
          onDragOver={(event) => {
            if (dragging === null) return
            event.preventDefault()
            setOver(index)
          }}
          onDragLeave={() => setOver((current) => (current === index ? null : current))}
          onDrop={(event) => {
            event.preventDefault()
            if (dragging !== null && dragging !== index) onChange(moveItem(items, dragging, index))
            setDragging(null)
            setOver(null)
          }}
          onDragEnd={() => {
            setDragging(null)
            setOver(null)
            setArmed(null)
          }}
          className={cn(
            'bg-background flex items-center gap-1 rounded-md border py-1 pr-1 pl-1.5',
            dragging === index && 'opacity-50',
            over === index && dragging !== index && 'border-primary ring-primary/30 ring-2'
          )}
        >
          <span
            aria-hidden
            data-drag-handle
            onPointerDown={() => setArmed(index)}
            onPointerUp={() => setArmed(null)}
            className="text-muted-foreground flex cursor-grab items-center active:cursor-grabbing"
          >
            <GripVertical className="size-4 shrink-0" />
          </span>
          <div className="min-w-0 flex-1">{render(item, index)}</div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            aria-label={`Move ${label} up`}
            disabled={index === 0}
            onClick={() => onChange(moveItem(items, index, index - 1))}
          >
            <ArrowUp />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            aria-label={`Move ${label} down`}
            disabled={index === items.length - 1}
            onClick={() => onChange(moveItem(items, index, index + 1))}
          >
            <ArrowDown />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            aria-label={`Remove ${label}`}
            onClick={() => onChange(items.filter((_, i) => i !== index))}
          >
            <X />
          </Button>
        </li>
      ))}
    </ol>
  )
}
