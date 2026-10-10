import { useEffect, useState } from 'react'
import { Head } from '@inertiajs/react'
import { RotateCcw, Trash2 } from 'lucide-react'
import type { InertiaProps } from '~/types'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Skeleton } from '~/components/ui/skeleton'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '~/components/ui/sheet'
import ConfirmAction from '~/components/admin/confirm_action'
import { getJson } from '~/lib/http'
import {
  BulkActions,
  ListEmpty,
  ListHeader,
  ListSearch,
  ListTable,
  ListToolbar,
  Pagination,
  RowActionButton,
  RowActionConfirm,
  RowActions,
  ScreenOptions,
  StatusLinks,
  useScreenOptions,
  useSelection,
  type Column,
  type ListMeta,
} from '~/components/admin/list'
import { useCan } from '~/hooks/use_can'
import { formatDateTime } from '~/lib/format'
import { urlFor } from '~/client'

type Item = {
  key: string
  kind: string
  kindLabel: string
  id: number
  title: string
  detail: string | null
  collection: string | null
  status: string | null
  deletedAt: string
}

type Details = {
  kind: string
  kindLabel: string
  id: number
  title: string
  facts: [string, string][]
  deletedAt: string | null
  deletedBy: string | null
  restoresAsDraft: boolean
  restoreBlocker: string | null
}

function timeAgo(value: string) {
  const seconds = Math.round((new Date(value).getTime() - Date.now()) / 1000)
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31536000],
    ['month', 2592000],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ]
  const format = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return format.format(Math.round(seconds / size), unit)
  }
  return format.format(seconds, 'second')
}

function useDetails(item: Item) {
  const [state, setState] = useState<{ details: Details | null; failed: boolean }>({
    details: null,
    failed: false,
  })
  const { kind, id } = item
  useEffect(() => {
    let active = true
    getJson<Details>(urlFor('admin.trash.show', { type: kind, id }))
      .then((details) => active && setState({ details, failed: false }))
      .catch(() => active && setState({ details: null, failed: true }))
    return () => {
      active = false
    }
  }, [kind, id])
  return state
}

function DetailsBody({ item, canAct }: { item: Item; canAct: boolean }) {
  const { details, failed } = useDetails(item)
  return (
    <div className="grid gap-5 p-4">
      {failed ? (
        <p className="text-destructive text-sm">Couldn’t load the details. It may be gone.</p>
      ) : !details ? (
        <div className="grid gap-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-3/5" />
        </div>
      ) : (
        <dl className="grid grid-cols-3 gap-x-4 gap-y-2.5 text-sm">
          {details.facts.map(([name, value]) => (
            <div key={name} className="contents">
              <dt className="text-muted-foreground">{name}</dt>
              <dd className="col-span-2 break-all">{value}</dd>
            </div>
          ))}
          <dt className="text-muted-foreground">Deleted</dt>
          <dd className="col-span-2" data-deleted>
            {details.deletedAt ? (
              <span title={formatDateTime(details.deletedAt)}>{timeAgo(details.deletedAt)}</span>
            ) : (
              '—'
            )}
            {details.deletedBy && (
              <>
                {' '}
                by <span className="font-medium">{details.deletedBy}</span>
              </>
            )}
            {details.deletedAt && (
              <div className="text-muted-foreground text-xs">
                {formatDateTime(details.deletedAt)}
              </div>
            )}
          </dd>
        </dl>
      )}
      {details?.restoreBlocker && (
        <p className="rounded-md border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          {details.restoreBlocker}
        </p>
      )}
      {canAct && (
        <div className="flex flex-wrap items-center gap-2">
          <ConfirmAction
            href={urlFor('admin.trash.restore', { type: item.kind, id: item.id })}
            method="post"
            destructive={false}
            title={`Restore “${item.title}”?`}
            description={
              details?.restoresAsDraft
                ? 'It was live. Restored by you, it comes back as a draft for someone who can publish.'
                : 'It comes back as it was.'
            }
            confirmLabel="Restore"
            trigger={
              <Button size="sm">
                <RotateCcw />
                Restore
              </Button>
            }
          />
          <ConfirmAction
            href={urlFor('admin.trash.destroy', { type: item.kind, id: item.id })}
            title={`Delete “${item.title}” permanently?`}
            description="It's deleted for good. This can't be undone."
            confirmLabel="Delete permanently"
            trigger={
              <Button size="sm" variant="outline" className="text-destructive">
                <Trash2 />
                Delete permanently
              </Button>
            }
          />
        </div>
      )}
      {canAct && details?.restoresAsDraft && (
        <p className="text-muted-foreground text-xs">
          It was live; restored by you, it comes back as a draft for someone who can publish.
        </p>
      )}
    </div>
  )
}

function DetailsSheet({
  item,
  canAct,
  onClose,
}: {
  item: Item | null
  canAct: boolean
  onClose: () => void
}) {
  return (
    <Sheet open={Boolean(item)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full gap-0 sm:max-w-md" data-trash-details>
        <SheetHeader className="border-b">
          <Badge variant="outline" className="w-fit">
            {item?.kindLabel}
          </Badge>
          <SheetTitle className="text-lg">{item?.title}</SheetTitle>
          <SheetDescription>In the trash. Restore it, or delete it for good.</SheetDescription>
        </SheetHeader>
        {item && <DetailsBody key={item.key} item={item} canAct={canAct} />}
      </SheetContent>
    </Sheet>
  )
}

type Props = InertiaProps<{
  items: Item[]
  kinds: { kind: string; label: string }[]
  counts: Record<string, number>
  meta: ListMeta
  filters: { kind: string; search: string }
}>

export default function Trash({ items, kinds, counts, meta, filters }: Props) {
  const can = useCan()
  const canAct = can('trash:write')
  const selection = useSelection(items.map((item) => item.key))
  const [open, setOpen] = useState<Item | null>(null)

  const columns: Column<Item>[] = [
    {
      id: 'title',
      label: 'Title',
      primary: true,
      cell: (item) => (
        <>
          <button
            type="button"
            data-list-open
            onClick={() => setOpen(item)}
            className="text-left font-medium hover:underline"
          >
            {item.title}
          </button>
          {item.detail && (
            <div className="text-muted-foreground font-mono text-xs">{item.detail}</div>
          )}
          <RowActions>
            <RowActionButton onClick={() => setOpen(item)} keys="i">
              Details
            </RowActionButton>
            {canAct && (
              <>
                <RowActionConfirm
                  href={urlFor('admin.trash.restore', { type: item.kind, id: item.id })}
                  method="post"
                  destructive={false}
                  title={`Restore “${item.title}”?`}
                  description="It comes back as it was. If you can't publish, it comes back as a draft."
                  confirmLabel="Restore"
                  keys="r"
                >
                  Restore
                </RowActionConfirm>
                <RowActionConfirm
                  href={urlFor('admin.trash.destroy', { type: item.kind, id: item.id })}
                  title={`Delete “${item.title}” permanently?`}
                  description="This removes it and its version history for good. It can't be undone."
                  confirmLabel="Delete permanently"
                  keys="d"
                >
                  Delete permanently
                </RowActionConfirm>
              </>
            )}
          </RowActions>
        </>
      ),
    },
    {
      id: 'kind',
      label: 'Type',
      cell: (item) => <Badge variant="outline">{item.kindLabel}</Badge>,
    },
    {
      id: 'collection',
      label: 'Collection',
      className: 'text-muted-foreground text-sm',
      cell: (item) => item.collection ?? '—',
    },
    {
      id: 'status',
      label: 'Status',
      className: 'text-muted-foreground text-sm capitalize',
      cell: (item) => item.status ?? '—',
    },
    {
      id: 'deleted',
      label: 'Deleted',
      className: 'text-muted-foreground text-sm whitespace-nowrap',
      cell: (item) => formatDateTime(item.deletedAt),
    },
  ]
  const screen = useScreenOptions('trash', columns)

  return (
    <>
      <Head title="Trash" />
      <ListHeader
        title="Trash"
        search={filters.search}
        description="Deleted content waits here until it's restored or deleted permanently."
        aside={<ScreenOptions screen={screen} />}
      />
      <StatusLinks
        param="kind"
        current={filters.kind}
        options={[
          { label: 'All', value: '', count: counts.all ?? 0 },
          ...kinds.map((kind) => ({
            label: kind.label,
            value: kind.kind,
            count: counts[kind.kind] ?? 0,
            hideWhenEmpty: true,
          })),
        ]}
      />
      <ListToolbar search={<ListSearch value={filters.search} placeholder="Search the trash…" />}>
        <BulkActions
          url={urlFor('admin.trash.bulk')}
          selection={selection}
          noun={['item', 'items']}
          actions={[
            canAct && { value: 'restore', label: 'Restore' },
            canAct && {
              value: 'delete',
              label: 'Delete permanently',
              destructive: true,
              confirm: {
                title: 'Delete {count} {noun} permanently?',
                description: "They're removed with their version history. This can't be undone.",
                label: 'Delete permanently',
              },
            },
          ]}
        />
      </ListToolbar>
      {items.length === 0 ? (
        <ListEmpty
          filtered={Boolean(filters.search || filters.kind)}
          resetHref={urlFor('admin.trash.index')}
          icon={<Trash2 className="size-8" />}
          title="The trash is empty"
          description="Deleted content lands here until you restore it or delete it permanently."
        />
      ) : (
        <ListTable
          rows={items}
          rowKey={(item) => item.key}
          rowLabel={(item) => item.title}
          columns={columns}
          screen={screen}
          selection={canAct ? selection : null}
        />
      )}
      <Pagination meta={meta} />
      <DetailsSheet item={open} canAct={canAct} onClose={() => setOpen(null)} />
    </>
  )
}
