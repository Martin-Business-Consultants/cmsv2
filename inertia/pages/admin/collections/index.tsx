import { Head } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { Library } from 'lucide-react'
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
  useScreenOptions,
  useSelection,
  type Column,
  type ListMeta,
} from '~/components/admin/list'
import { useCan } from '~/hooks/use_can'
import { formatDate } from '~/lib/format'
import { urlFor } from '~/client'
import {
  NewCollectionDialog,
  type CollectionTemplateOption,
} from '~/components/admin/start_from_dialog'

type Collection = Data.Collection

type Props = InertiaProps<{
  collections: Collection[]
  meta: ListMeta
  total: number
  templates: CollectionTemplateOption[]
  filters: { search: string; sort: string; order: 'asc' | 'desc' }
}>

export default function CollectionsIndex({ collections, meta, total, templates, filters }: Props) {
  const can = useCan()
  const canWrite = can('collections:write')
  const canDelete = can('collections:delete')
  const selection = useSelection(collections.map((collection) => collection.id))

  const columns: Column<Collection>[] = [
    {
      id: 'name',
      label: 'Name',
      primary: true,
      sort: 'name',
      cell: (collection) => {
        const edit = urlFor('admin.collections.edit', { id: collection.id })
        const entries = urlFor('admin.entries.index', { collectionId: collection.id })
        return (
          <div className="flex items-start gap-2.5">
            <span className="bg-muted flex size-7 shrink-0 items-center justify-center rounded-md">
              <Icon name={collection.icon} className="size-4" />
            </span>
            <div className="min-w-0">
              <RowTitle href={edit}>{collection.name}</RowTitle>
              <RowActions>
                <RowAction href={edit} keys="e">
                  {canWrite ? 'Edit' : 'Fields'}
                </RowAction>
                {can('entries:read') && (
                  <RowAction href={entries} keys="v">
                    View entries
                  </RowAction>
                )}
                {can('entries:write') && (
                  <RowAction href={urlFor('admin.entries.create', { collectionId: collection.id })}>
                    Add {collection.singularName.toLowerCase()}
                  </RowAction>
                )}
                {canDelete && (
                  <RowActionConfirm
                    href={urlFor('admin.collections.destroy', { id: collection.id })}
                    title={`Delete “${collection.name}”?`}
                    description="The collection and its field definitions are removed. It must have no entries left."
                    confirmLabel="Delete"
                    keys="d"
                  >
                    Delete
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
      cell: (collection) => collection.slug,
    },
    {
      id: 'url',
      label: 'Public URL',
      className: 'text-muted-foreground font-mono text-xs',
      cell: (collection) => (collection.urlPrefix ? `/${collection.urlPrefix}/…` : '—'),
    },
    {
      id: 'fields',
      label: 'Fields',
      cell: (collection) => <Badge variant="secondary">{collection.fields.length}</Badge>,
    },
    {
      id: 'entries',
      label: 'Entries',
      sort: 'entries',
      defaultOrder: 'desc',
      cell: (collection) => (
        <Link
          route="admin.entries.index"
          routeParams={{ collectionId: collection.id }}
          className="text-sm tabular-nums hover:underline"
        >
          {collection.entriesCount}
        </Link>
      ),
    },
    {
      id: 'updated',
      label: 'Updated',
      sort: 'updated',
      defaultOrder: 'desc',
      className: 'text-muted-foreground text-sm whitespace-nowrap',
      cell: (collection) => formatDate(collection.updatedAt),
    },
  ]
  const screen = useScreenOptions('collections', columns)

  return (
    <>
      <Head title="Collections" />
      <ListHeader
        title="Collections"
        count={total}
        actions={canWrite && <NewCollectionDialog templates={templates} />}
        search={filters.search}
        description="Repeatable content types like posts, team members or FAQs, and the fields each entry has."
        aside={<ScreenOptions screen={screen} />}
      />
      <ListToolbar search={<ListSearch value={filters.search} placeholder="Search collections…" />}>
        <BulkActions
          url={urlFor('admin.collections.bulk')}
          selection={selection}
          noun={['collection', 'collections']}
          actions={[
            canDelete && {
              value: 'delete',
              label: 'Delete',
              destructive: true,
              confirm: {
                title: 'Delete {count} {noun}?',
                description:
                  "Collections that still have entries are skipped. This can't be undone.",
                label: 'Delete',
              },
            },
          ]}
        />
      </ListToolbar>
      {collections.length === 0 ? (
        <ListEmpty
          filtered={Boolean(filters.search)}
          resetHref={urlFor('admin.collections.index')}
          icon={<Library className="size-8" />}
          title="No collections yet"
          description="Create a collection to manage structured content such as blog posts or products."
        />
      ) : (
        <ListTable
          rows={collections}
          rowKey={(collection) => collection.id}
          rowLabel={(collection) => collection.name}
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
