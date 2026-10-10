import { Head } from '@inertiajs/react'
import { Globe } from 'lucide-react'
import type { Data } from '@generated/data'
import type { InertiaProps } from '~/types'
import { Badge } from '~/components/ui/badge'
import Icon from '~/components/admin/dynamic_icon'
import {
  BulkActions,
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

type Global = Data.Global.Variants['forList']

type Props = InertiaProps<{
  globals: Global[]
  meta: ListMeta
  counts: { all: number; trash: number }
  filters: { search: string; sort: string; order: 'asc' | 'desc' }
}>

export default function GlobalsIndex({ globals, meta, counts, filters }: Props) {
  const can = useCan()
  const canWrite = can('globals:write')
  const canDelete = can('globals:delete')
  const selection = useSelection(globals.map((global) => global.id))

  const columns: Column<Global>[] = [
    {
      id: 'name',
      label: 'Name',
      primary: true,
      sort: 'name',
      cell: (global) => {
        const edit = urlFor('admin.globals.edit', { id: global.id })
        return (
          <div className="flex items-start gap-2.5">
            <span className="bg-muted flex size-7 shrink-0 items-center justify-center rounded-md">
              <Icon name={global.icon ?? 'globe'} className="size-4" />
            </span>
            <div className="min-w-0">
              <RowTitle href={edit}>{global.name}</RowTitle>
              {global.description && (
                <p className="text-muted-foreground mt-0.5 text-xs">{global.description}</p>
              )}
              <RowActions>
                <RowAction href={edit} keys="e">
                  {canWrite ? 'Edit' : 'View'}
                </RowAction>
                {canWrite && (
                  <RowAction
                    href={urlFor(
                      'admin.globals.edit',
                      { id: global.id },
                      { qs: { tab: 'fields' } }
                    )}
                  >
                    Fields
                  </RowAction>
                )}
                {canDelete && (
                  <RowActionConfirm
                    href={urlFor('admin.globals.destroy', { id: global.id })}
                    title={`Move “${global.name}” to the trash?`}
                    description="It goes to the trash, where it can be restored."
                    confirmLabel="Move to trash"
                    keys="d"
                  >
                    Trash
                  </RowActionConfirm>
                )}
              </RowActions>
            </div>
          </div>
        )
      },
    },
    {
      id: 'slug',
      label: 'Slug',
      sort: 'slug',
      className: 'text-muted-foreground font-mono text-xs',
      cell: (global) => global.slug,
    },
    {
      id: 'fields',
      label: 'Fields',
      cell: (global) => <Badge variant="secondary">{global.fieldsCount}</Badge>,
    },
    {
      id: 'updated',
      label: 'Updated',
      sort: 'updated',
      defaultOrder: 'desc',
      className: 'text-muted-foreground text-sm whitespace-nowrap',
      cell: (global) => formatDate(global.updatedAt),
    },
  ]
  const screen = useScreenOptions('globals', columns)

  return (
    <>
      <Head title="Globals" />
      <ListHeader
        title="Globals"
        addNew={canWrite && { href: urlFor('admin.globals.create'), label: 'Add New Global' }}
        search={filters.search}
        description="One-off content used across the site, like navigation, contact details or footer text."
        aside={<ScreenOptions screen={screen} />}
      />
      <StatusLinks
        current=""
        options={[
          { label: 'All', value: '', count: counts.all },
          ...(can('trash:read') && counts.trash
            ? [
                {
                  label: 'Trash',
                  value: '__trash',
                  count: counts.trash,
                  href: '/admin/trash?kind=global',
                },
              ]
            : []),
        ]}
      />
      <ListToolbar search={<ListSearch value={filters.search} placeholder="Search globals…" />}>
        <BulkActions
          url={urlFor('admin.globals.bulk')}
          selection={selection}
          noun={['global', 'globals']}
          actions={[
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
      {globals.length === 0 ? (
        <ListEmpty
          filtered={Boolean(filters.search)}
          resetHref={urlFor('admin.globals.index')}
          icon={<Globe className="size-8" />}
          title="No globals yet"
          description="Create a global for content that appears in many places but is edited once."
        />
      ) : (
        <ListTable
          rows={globals}
          rowKey={(global) => global.id}
          rowLabel={(global) => global.name}
          columns={columns}
          screen={screen}
          selection={canDelete ? selection : null}
          sort={filters}
        />
      )}
      <Pagination meta={meta} />
    </>
  )
}
