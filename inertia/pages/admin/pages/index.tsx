import { Head } from '@inertiajs/react'
import { FileText } from 'lucide-react'
import type { Data } from '@generated/data'
import type { InertiaProps } from '~/types'
import StatusBadge from '~/components/admin/status_badge'
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
import { NewPageDialog, type PageTemplateOption } from '~/components/admin/start_from_dialog'

type Page = Data.Page.Variants['forList']

type Props = InertiaProps<{
  pages: Page[]
  meta: ListMeta
  counts: Record<string, number>
  templates: PageTemplateOption[]
  filters: { search: string; status: string; sort: string; order: 'asc' | 'desc'; locale?: string }
  locales?: ListLocales
}>

export default function PagesIndex({ pages, meta, counts, templates, filters, locales }: Props) {
  const can = useCan()
  const canWrite = can('pages:write')
  const canPublish = can('pages:publish')
  const canDelete = can('pages:delete')
  const tree = !filters.sort && !filters.search
  const selection = useSelection(pages.map((page) => page.id))

  const columns: Column<Page>[] = [
    {
      id: 'title',
      label: 'Title',
      primary: true,
      sort: 'title',
      cell: (page) => {
        const depth = tree ? page.path.split('/').length - 1 : 0
        const edit = urlFor('admin.pages.edit', { id: page.id })
        return (
          <div style={{ paddingLeft: `${Math.min(depth, 6) * 1.25}rem` }}>
            <RowTitle href={edit}>
              {depth > 0 && <span className="text-muted-foreground mr-1">—</span>}
              {page.title}
            </RowTitle>
            <RowActions>
              {canWrite && (
                <RowAction href={edit} keys="e">
                  Edit
                </RowAction>
              )}
              <RowAction href={urlFor('admin.previews.page', { id: page.id })} external>
                Preview
              </RowAction>
              {page.isLive && (
                <RowAction href={page.publicPath} external keys="v">
                  View
                </RowAction>
              )}
              {canDelete && (
                <RowActionConfirm
                  href={urlFor('admin.pages.destroy', { id: page.id })}
                  title={`Move “${page.title}” to the trash?`}
                  description="It goes to the trash, where it can be restored."
                  confirmLabel="Move to trash"
                  keys="d"
                >
                  Trash
                </RowActionConfirm>
              )}
            </RowActions>
          </div>
        )
      },
    },
    {
      id: 'path',
      label: 'Path',
      sort: 'path',
      className: 'text-muted-foreground font-mono text-xs',
      cell: (page) => page.publicPath,
    },
    {
      id: 'status',
      label: 'Status',
      sort: 'status',
      cell: (page) => <StatusBadge status={page.status} live={page.isLive} />,
    },
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
      cell: (page) => formatDate(page.updatedAt),
    },
  ]
  const screen = useScreenOptions('pages', columns)
  const filtered = Boolean(filters.search || filters.status || filters.locale)

  return (
    <>
      <Head title="Pages" />
      <ListHeader
        title="Pages"
        actions={canWrite && <NewPageDialog templates={templates} />}
        search={filters.search}
        aside={<ScreenOptions screen={screen} />}
      />
      <StatusLinks
        current={filters.status}
        options={contentStatusLinks(counts, can('trash:read') ? '/admin/trash?kind=page' : null)}
      />
      <ListToolbar search={<ListSearch value={filters.search} placeholder="Search pages…" />}>
        <LocaleFilter locales={locales} value={filters.locale} />
        <BulkActions
          url={urlFor('admin.pages.bulk')}
          selection={selection}
          noun={['page', 'pages']}
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
      {pages.length === 0 ? (
        <ListEmpty
          filtered={filtered}
          resetHref={urlFor('admin.pages.index')}
          icon={<FileText className="size-8" />}
          title="No pages yet"
          description="The first one is usually the home page."
        />
      ) : (
        <ListTable
          rows={pages}
          rowKey={(page) => page.id}
          rowLabel={(page) => page.title}
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
