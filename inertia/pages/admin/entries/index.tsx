import { Head } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { KanbanSquare, Settings2 } from 'lucide-react'
import type { Data } from '@generated/data'
import type { InertiaProps } from '~/types'
import { Button } from '~/components/ui/button'
import StatusBadge from '~/components/admin/status_badge'
import Icon from '~/components/admin/dynamic_icon'
import {
  BulkActions,
  contentStatusLinks,
  ListEmpty,
  ListHeader,
  ListSearch,
  ListTable,
  ListToolbar,
  Pagination,
  RowAction,
  RowActionConfirm,
  RowActions,
  RowTitle,
  ScreenOptions,
  StatusLinks,
  useScreenOptions,
  useSelection,
  type Column,
  type ListMeta,
} from '~/components/admin/list'
import { useCan } from '~/hooks/use_can'
import { formatDate } from '~/lib/format'
import { urlFor } from '~/client'
import LocaleFilter, { showsLocales, type ListLocales } from '~/components/admin/locale_filter'
import FlagToggle from '~/components/board/flag_toggle'

type Entry = Data.Entry.Variants['forList']

type Props = InertiaProps<{
  collection: Data.Collection
  entries: Entry[]
  meta: ListMeta
  counts: Record<string, number>
  filters: { search: string; status: string; sort: string; order: 'asc' | 'desc'; locale?: string }
  locales?: ListLocales
  flagFields?: { name: string; label: string }[]
  flags?: Record<number, Record<string, boolean>>
  hasBoard?: boolean
}>

export default function EntriesIndex({
  collection,
  entries,
  meta,
  counts,
  filters,
  locales,
  flagFields = [],
  flags = {},
  hasBoard,
}: Props) {
  const can = useCan()
  const canWrite = can('entries:write')
  const canPublish = can('entries:publish')
  const canDelete = can('entries:delete')
  const selection = useSelection(entries.map((entry) => entry.id))
  const singular = collection.singularName
  const plural = collection.name.toLowerCase()
  const ids = (entry: Entry) => ({ collectionId: collection.id, id: entry.id })

  const columns: Column<Entry>[] = [
    {
      id: 'title',
      label: 'Title',
      primary: true,
      sort: 'title',
      cell: (entry) => {
        const edit = urlFor('admin.entries.edit', ids(entry))
        return (
          <>
            <RowTitle href={edit}>{entry.title}</RowTitle>
            <RowActions>
              {canWrite && (
                <RowAction href={edit} keys="e">
                  Edit
                </RowAction>
              )}
              <RowAction href={urlFor('admin.previews.entry', ids(entry))} external>
                Preview
              </RowAction>
              {entry.isLive && entry.publicPath && (
                <RowAction href={entry.publicPath} external keys="v">
                  View
                </RowAction>
              )}
              {canDelete && (
                <RowActionConfirm
                  href={urlFor('admin.entries.destroy', ids(entry))}
                  title={`Move “${entry.title}” to the trash?`}
                  description="It goes to the trash, where it can be restored."
                  confirmLabel="Move to trash"
                  keys="d"
                >
                  Trash
                </RowActionConfirm>
              )}
            </RowActions>
          </>
        )
      },
    },
    {
      id: 'slug',
      label: collection.urlPrefix ? 'URL' : 'Slug',
      sort: 'slug',
      className: 'text-muted-foreground font-mono text-xs',
      cell: (entry) => entry.publicPath ?? entry.slug,
    },
    {
      id: 'status',
      label: 'Status',
      sort: 'status',
      cell: (entry) => <StatusBadge status={entry.status} live={entry.isLive} />,
    },
    ...flagFields.map(
      (field): Column<Entry> => ({
        id: `flag:${field.name}`,
        label: field.label,
        className: 'whitespace-nowrap',
        cell: (entry) => (
          <FlagToggle
            collectionId={collection.id}
            entryId={entry.id}
            entryTitle={entry.title}
            field={field}
            on={Boolean(flags[entry.id]?.[field.name])}
            canWrite={canWrite}
          />
        ),
      })
    ),
    ...(showsLocales(locales)
      ? [
          {
            id: 'locale',
            label: 'Language',
            className: 'text-muted-foreground font-mono text-xs uppercase',
            cell: (row: { locale: string }) => row.locale,
          },
        ]
      : []),
    {
      id: 'updated',
      label: 'Updated',
      sort: 'updated',
      defaultOrder: 'desc',
      className: 'text-muted-foreground text-sm whitespace-nowrap',
      cell: (entry) => formatDate(entry.updatedAt),
    },
  ]
  const screen = useScreenOptions(`entries:${collection.slug}`, columns)
  const newHref = urlFor('admin.entries.create', { collectionId: collection.id })

  return (
    <>
      <Head title={collection.name} />
      <ListHeader
        title={
          <>
            <Icon name={collection.icon} className="text-muted-foreground size-5" />
            {collection.name}
          </>
        }
        addNew={canWrite && { href: newHref, label: `Add New ${singular}` }}
        search={filters.search}
        description={collection.description}
        actions={
          <>
            {hasBoard && (
              <Button asChild variant="outline" size="sm">
                <Link route="admin.entry_boards.show" routeParams={{ collectionId: collection.id }}>
                  <KanbanSquare />
                  Build
                </Link>
              </Button>
            )}
            {can('collections:write') && (
              <Button asChild variant="ghost" size="sm">
                <Link route="admin.collections.edit" routeParams={{ id: collection.id }}>
                  <Settings2 />
                  Fields
                </Link>
              </Button>
            )}
          </>
        }
        aside={<ScreenOptions screen={screen} />}
      />
      <StatusLinks
        current={filters.status}
        options={contentStatusLinks(counts, can('trash:read') ? '/admin/trash?kind=entry' : null)}
      />
      <ListToolbar search={<ListSearch value={filters.search} placeholder={`Search ${plural}…`} />}>
        <LocaleFilter locales={locales} value={filters.locale} />
        <BulkActions
          url={urlFor('admin.entries.bulk', { collectionId: collection.id })}
          selection={selection}
          noun={[singular.toLowerCase(), plural]}
          actions={[
            canPublish && { value: 'publish', label: 'Publish' },
            canPublish && { value: 'unpublish', label: 'Unpublish' },
            canPublish && { value: 'archive', label: 'Archive' },
            canDelete && {
              value: 'trash',
              label: 'Move to Trash',
              destructive: true,
              confirm: {
                title: 'Move {count} {noun} to the trash?',
                description: 'They go to the trash, where they can be restored.',
                label: 'Move to trash',
              },
            },
          ]}
        />
      </ListToolbar>
      {entries.length === 0 ? (
        <ListEmpty
          filtered={Boolean(filters.search || filters.status || filters.locale)}
          resetHref={urlFor('admin.entries.index', { collectionId: collection.id })}
          icon={<Icon name={collection.icon} className="size-8" />}
          title={`No ${plural} yet`}
          description={`Create the first ${singular.toLowerCase()} in this collection.`}
        />
      ) : (
        <ListTable
          rows={entries}
          rowKey={(entry) => entry.id}
          rowLabel={(entry) => entry.title}
          columns={columns}
          screen={screen}
          selection={canPublish || canDelete ? selection : null}
          sort={filters}
        />
      )}
      <Pagination meta={meta} />
    </>
  )
}
