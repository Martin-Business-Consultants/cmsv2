import { useState } from 'react'
import { Head, router } from '@inertiajs/react'
import { Blocks, PackagePlus } from 'lucide-react'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import type { InertiaProps } from '~/types'
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
import { urlFor } from '~/client'

type BlockTypeRow = {
  id: number
  slug: string
  label: string
  category: string | null
  description: string | null
  icon: string | null
  fieldCount: number
  deprecated: boolean
  builtIn: boolean
  usage: { pages: number; entries: number; globals: number }
}

type Props = InertiaProps<{
  blockTypes: BlockTypeRow[]
  meta: ListMeta
  categories: { value: string; count: number }[]
  total: number
  starterMissing: number
  filters: { search: string; category: string; sort: string; order: 'asc' | 'desc' }
}>

function usageLabel(usage: BlockTypeRow['usage']) {
  const parts = [
    usage.pages && `${usage.pages} ${usage.pages === 1 ? 'page' : 'pages'}`,
    usage.entries && `${usage.entries} ${usage.entries === 1 ? 'entry' : 'entries'}`,
    usage.globals && `${usage.globals} ${usage.globals === 1 ? 'global' : 'globals'}`,
  ].filter(Boolean)
  return parts.length ? parts.join(', ') : null
}

function isUsed(usage: BlockTypeRow['usage']) {
  return usage.pages + usage.entries + usage.globals > 0
}

function InstallStarter({ missing, empty }: { missing: number; empty: boolean }) {
  const [busy, setBusy] = useState(false)
  return (
    <div
      data-install-starter
      className="bg-muted/40 mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm"
    >
      <p className="text-muted-foreground">
        {empty
          ? 'Start with the starter pack: heroes, feature grids, text, galleries and more.'
          : `${missing} starter block ${missing === 1 ? 'type isn’t' : 'types aren’t'} installed yet. Installing adds only the missing ones.`}
      </p>
      <Button
        type="button"
        size="sm"
        variant={empty ? 'default' : 'outline'}
        disabled={busy}
        onClick={() =>
          router.post(
            urlFor('admin.block_types.seed'),
            {},
            { onStart: () => setBusy(true), onFinish: () => setBusy(false) }
          )
        }
      >
        <PackagePlus />
        {busy ? 'Installing…' : 'Install starter block types'}
      </Button>
    </div>
  )
}

export default function BlockTypesIndex({
  blockTypes,
  meta,
  categories,
  total,
  starterMissing,
  filters,
}: Props) {
  const can = useCan()
  const canWrite = can('block_types:write')
  const canDelete = can('block_types:delete')
  const selection = useSelection(blockTypes.map((type) => type.id))

  const columns: Column<BlockTypeRow>[] = [
    {
      id: 'label',
      label: 'Block',
      primary: true,
      sort: 'label',
      cell: (type) => {
        const edit = urlFor('admin.block_types.edit', { id: type.id })
        return (
          <div className="flex items-start gap-3">
            <div className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-md">
              <Icon name={type.icon} className="size-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <RowTitle href={edit}>{type.label}</RowTitle>
                {type.deprecated && <Badge variant="secondary">Deprecated</Badge>}
              </div>
              {type.description && (
                <div className="text-muted-foreground text-xs">{type.description}</div>
              )}
              <RowActions>
                <RowAction href={edit} keys="e">
                  {canWrite ? 'Edit' : 'View'}
                </RowAction>
                {canDelete && !isUsed(type.usage) && (
                  <RowActionConfirm
                    href={urlFor('admin.block_types.destroy', { id: type.id })}
                    title={`Delete “${type.label}”?`}
                    description="Editors can no longer add this block. This can't be undone."
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
      cell: (type) => type.slug,
    },
    {
      id: 'category',
      label: 'Category',
      sort: 'category',
      className: 'text-muted-foreground text-sm',
      cell: (type) => type.category || '—',
    },
    {
      id: 'fields',
      label: 'Fields',
      className: 'text-muted-foreground text-sm tabular-nums',
      cell: (type) => type.fieldCount,
    },
    {
      id: 'source',
      label: 'Source',
      className: 'text-muted-foreground text-sm',
      cell: (type) => (type.builtIn ? 'Built-in' : 'Custom'),
    },
    {
      id: 'usage',
      label: 'Used in',
      className: 'text-sm',
      cell: (type) =>
        usageLabel(type.usage) ?? <span className="text-muted-foreground">Unused</span>,
    },
  ]
  const screen = useScreenOptions('block_types', columns)

  return (
    <>
      <Head title="Block types" />
      <ListHeader
        title="Block types"
        addNew={
          canWrite && { href: urlFor('admin.block_types.create'), label: 'Add New Block Type' }
        }
        search={filters.search}
        description="The building blocks editors use to compose pages."
        aside={<ScreenOptions screen={screen} />}
      />
      {categories.length > 1 && (
        <StatusLinks
          param="category"
          current={filters.category}
          options={[
            { label: 'All', value: '', count: total },
            ...categories.map((category) => ({
              label: category.value === '_none' ? 'Uncategorized' : category.value,
              value: category.value,
              count: category.count,
            })),
          ]}
        />
      )}
      {canWrite && starterMissing > 0 && (
        <InstallStarter missing={starterMissing} empty={total === 0} />
      )}
      <ListToolbar search={<ListSearch value={filters.search} placeholder="Search block types…" />}>
        <BulkActions
          url={urlFor('admin.block_types.bulk')}
          selection={selection}
          noun={['block type', 'block types']}
          actions={[
            canDelete && {
              value: 'delete',
              label: 'Delete',
              destructive: true,
              confirm: {
                title: 'Delete {count} {noun}?',
                description: "Block types still in use are skipped. This can't be undone.",
                label: 'Delete',
              },
            },
          ]}
        />
      </ListToolbar>
      {blockTypes.length === 0 ? (
        <ListEmpty
          filtered={Boolean(filters.search || filters.category)}
          resetHref={urlFor('admin.block_types.index')}
          icon={<Blocks className="size-8" />}
          title="No block types yet"
          description="Define a block type to give editors something to add to pages."
        />
      ) : (
        <ListTable
          rows={blockTypes}
          rowKey={(type) => type.id}
          rowLabel={(type) => type.label}
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
