import { useEffect, useRef, useState, type DragEvent } from 'react'
import { Head, router } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { GripVertical, Info, ListIcon, Settings2, TriangleAlert } from 'lucide-react'
import type { Data } from '@generated/data'
import type { InertiaProps } from '~/types'
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'
import PageHeader from '~/components/admin/page_header'
import StatusBadge from '~/components/admin/status_badge'
import Icon from '~/components/admin/dynamic_icon'
import CardField, { type BoardField } from '~/components/board/card_field'
import { useCan } from '~/hooks/use_can'
import { useScreenKeys } from '~/hooks/use_keyboard'
import { cn } from '~/lib/utils'
import { urlFor } from '~/client'

type Card = {
  id: number
  title: string
  slug: string
  status: string
  isLive: boolean
  on: boolean
  values: Record<string, string | boolean>
}

type Column = 'off' | 'on'

type Props = InertiaProps<{
  collection: Data.Collection
  board: {
    field: BoardField
    labels: Record<Column, string>
    cardFields: BoardField[]
    moveFields: BoardField[]
    publishes: boolean
  }
  cards: Card[]
  canMove: boolean
}>

const COLUMNS: Column[] = ['off', 'on']

function sentence(words: string[]) {
  if (words.length <= 1) return words.join('')
  return `${words.slice(0, -1).join(', ')} and ${words.at(-1)}`
}

function moveDescription(board: Props['board']) {
  const names = sentence(board.moveFields.map((field) => field.label))
  const right = board.publishes ? `turns on ${names} and publishes the entry` : `turns on ${names}`
  const left = board.publishes ? 'turns them off and returns it to draft' : 'turns them off'
  return `Dragging a card to ${board.labels.on} ${right}. Dragging it back to ${board.labels.off} ${left}.`
}

export default function EntriesBoard({ collection, board, cards: initial, canMove }: Props) {
  const can = useCan()
  const canWrite = can('entries:write')
  const [cards, setCards] = useState(initial)
  const [dragging, setDragging] = useState<number | null>(null)
  const [hover, setHover] = useState<Column | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const refs = useRef(new Map<number, HTMLElement>())

  useEffect(() => setCards(initial), [initial])

  const columns: Record<Column, Card[]> = {
    off: cards.filter((card) => !card.on),
    on: cards.filter((card) => card.on),
  }

  function focus(id: number | undefined) {
    if (id === undefined) return
    setSelected(id)
    const element = refs.current.get(id)
    element?.focus({ preventScroll: true })
    element?.scrollIntoView({ block: 'nearest' })
  }

  function place(id: number, column: Column) {
    const card = cards.find((item) => item.id === id)
    if (!card || !canMove || card.on === (column === 'on')) return
    setCards((list) =>
      list.map((item) =>
        item.id === id
          ? {
              ...item,
              on: column === 'on',
              status: board.publishes ? (column === 'on' ? 'published' : 'draft') : item.status,
              isLive: board.publishes ? column === 'on' : item.isLive,
            }
          : item
      )
    )
    router.put(
      urlFor('admin.entry_boards.place', { collectionId: collection.id, id }),
      { column },
      {
        preserveScroll: true,
        preserveState: true,
        onError: () => setCards(initial),
        onFinish: () => requestAnimationFrame(() => focus(id)),
      }
    )
  }

  function locate(id: number | null) {
    for (const column of COLUMNS) {
      const index = columns[column].findIndex((card) => card.id === id)
      if (index >= 0) return { column, index }
    }
    return null
  }

  useScreenKeys((key) => {
    const at = locate(selected)
    const first = () => focus((columns.off[0] ?? columns.on[0])?.id)
    switch (key) {
      case 'j':
      case 'k': {
        if (!at) {
          first()
          return true
        }
        const list = columns[at.column]
        const index = Math.min(Math.max(at.index + (key === 'j' ? 1 : -1), 0), list.length - 1)
        focus(list[index]?.id)
        return true
      }
      case 'h':
      case 'l': {
        if (!at) {
          first()
          return true
        }
        const list = columns[key === 'l' ? 'on' : 'off']
        if (list.length) focus(list[Math.min(at.index, list.length - 1)].id)
        return true
      }
      case 'H':
      case 'L': {
        if (!at || selected === null) return false
        place(selected, key === 'L' ? 'on' : 'off')
        return true
      }
      case 'enter':
      case 'o': {
        if (!at || selected === null) return false
        router.visit(urlFor('admin.entries.edit', { collectionId: collection.id, id: selected }))
        return true
      }
      case 'esc': {
        if (selected === null) return false
        refs.current.get(selected)?.blur()
        setSelected(null)
        return true
      }
    }
    return false
  })

  function dragOver(column: Column) {
    return (event: DragEvent) => {
      if (dragging === null) return
      event.preventDefault()
      event.dataTransfer.dropEffect = 'move'
      setHover(column)
    }
  }

  function drop(column: Column) {
    return (event: DragEvent) => {
      event.preventDefault()
      const id = dragging ?? Number(event.dataTransfer.getData('text/plain'))
      setDragging(null)
      setHover(null)
      if (id) place(id, column)
    }
  }

  return (
    <>
      <Head title={`Build: ${collection.name}`} />
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <Icon name={collection.icon} className="text-muted-foreground size-5" />
            Build: {collection.name}
          </span>
        }
        back={{
          href: urlFor('admin.entries.index', { collectionId: collection.id }),
          label: collection.name,
        }}
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link route="admin.entries.index" routeParams={{ collectionId: collection.id }}>
                <ListIcon />
                Entries
              </Link>
            </Button>
            {can('collections:write') && (
              <Button asChild variant="ghost" size="sm">
                <Link route="admin.collections.edit" routeParams={{ id: collection.id }}>
                  <Settings2 />
                  Board settings
                </Link>
              </Button>
            )}
          </>
        }
      />

      {canMove ? (
        <p className="mb-6 flex items-start gap-2 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-100">
          <Info className="mt-0.5 size-4 shrink-0" />
          <span>
            {moveDescription(board)}{' '}
            <span className="text-sky-800/70 dark:text-sky-200/70">
              Keys: h j k l move between cards, H and L move the selected card.
            </span>
          </span>
        </p>
      ) : (
        <p className="mb-6 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          {board.publishes
            ? 'Moving a card on this board publishes or unpublishes the entry, which needs publish access. You can still change the fields on its cards.'
            : 'Moving a card needs permission to edit entries.'}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {COLUMNS.map((column) => {
          const list = columns[column]
          return (
            <section
              key={column}
              aria-label={board.labels[column]}
              data-board-column={column}
              onDragOver={dragOver(column)}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  setHover((current) => (current === column ? null : current))
                }
              }}
              onDrop={drop(column)}
              className={cn(
                'bg-muted/30 flex min-h-64 flex-col gap-3 rounded-xl border p-3 transition-colors',
                hover === column && 'border-primary bg-primary/5 ring-primary/20 ring-2'
              )}
            >
              <header className="flex items-center gap-2 px-1">
                <span
                  aria-hidden
                  className={cn(
                    'size-2 shrink-0 rounded-full',
                    column === 'on' ? 'bg-emerald-500' : 'bg-muted-foreground/30'
                  )}
                />
                <h2 className="text-sm font-semibold">{board.labels[column]}</h2>
                <Badge variant="secondary" className="tabular-nums">
                  {list.length}
                </Badge>
              </header>
              <div className="flex flex-col gap-2">
                {list.map((card) => (
                  <article
                    key={card.id}
                    ref={(element) => {
                      if (element) refs.current.set(card.id, element)
                      else refs.current.delete(card.id)
                    }}
                    tabIndex={0}
                    data-board-card={card.id}
                    aria-selected={selected === card.id}
                    draggable={canMove}
                    onFocus={() => setSelected(card.id)}
                    onDragStart={(event) => {
                      setDragging(card.id)
                      event.dataTransfer.effectAllowed = 'move'
                      event.dataTransfer.setData('text/plain', String(card.id))
                    }}
                    onDragEnd={() => {
                      setDragging(null)
                      setHover(null)
                    }}
                    className={cn(
                      'bg-card flex flex-col gap-3 rounded-lg border p-3 shadow-xs transition outline-none',
                      'hover:border-foreground/20 focus-visible:ring-ring/50 focus-visible:ring-[3px]',
                      selected === card.id && 'border-primary ring-primary/30 ring-2',
                      canMove && 'cursor-grab active:cursor-grabbing',
                      dragging === card.id && 'opacity-50'
                    )}
                  >
                    <div className="flex items-start gap-2">
                      {canMove && (
                        <GripVertical
                          aria-hidden
                          className="text-muted-foreground mt-0.5 size-4 shrink-0"
                        />
                      )}
                      <Link
                        route="admin.entries.edit"
                        routeParams={{ collectionId: collection.id, id: card.id }}
                        className="min-w-0 flex-1 text-sm leading-5 font-medium hover:underline"
                        tabIndex={-1}
                      >
                        {card.title}
                      </Link>
                      {card.status !== 'published' && (
                        <StatusBadge status={card.status} live={card.isLive} />
                      )}
                    </div>
                    {column === 'on' && board.cardFields.length > 0 && (
                      <div className="flex flex-col gap-2 border-t pt-3">
                        {board.cardFields.map((field) => (
                          <CardField
                            key={field.name}
                            collectionId={collection.id}
                            entryId={card.id}
                            field={field}
                            value={card.values[field.name] ?? ''}
                            disabled={!canWrite}
                          />
                        ))}
                      </div>
                    )}
                  </article>
                ))}
              </div>
              {list.length === 0 && (
                <p className="text-muted-foreground px-4 py-8 text-center text-sm">
                  Drag entries here
                </p>
              )}
            </section>
          )
        })}
      </div>
    </>
  )
}
