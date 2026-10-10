import { Fragment, useEffect, useRef, useState, type DragEvent } from 'react'
import { Head, router } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import {
  Folder,
  FolderPlus,
  ImageIcon,
  ImageOff,
  LayoutGrid,
  List,
  Pencil,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import type { InertiaProps } from '~/types'
import { Button } from '~/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '~/components/ui/tabs'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '~/components/ui/breadcrumb'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '~/components/ui/alert_dialog'
import {
  ListEmpty,
  ListHeader,
  ListSearch,
  ListTable,
  Pagination,
  SelectCheckbox,
  useListUrl,
  useSelection,
  type Column,
  type ListMeta,
  type SortState,
} from '~/components/admin/list'
import { useCan } from '~/hooks/use_can'
import { formatBytes, formatDate } from '~/lib/format'
import { cn } from '~/lib/utils'
import { urlFor } from '~/client'
import AssetThumb from '../../components/asset_thumb'
import AssetDetailsSheet from '../../components/asset_details_sheet'
import FolderSelect from '../../components/folder_select'
import FolderTree, { DRAG_TYPE, folderHref } from '../../components/folder_tree'
import {
  DeleteFolderDialog,
  EditFolderDialog,
  MoveDialog,
  NewFolderDialog,
} from '../../components/folder_dialogs'
import { UploadQueue, useUploadQueue } from '../../components/upload_queue'
import type { UploadOutcome } from '../../lib/upload'
import type { AssetUsage, FolderNode, LibraryFilters, MediaAsset } from '../../types'

type Props = InertiaProps<{
  assets: MediaAsset[]
  meta: ListMeta
  filters: LibraryFilters & SortState
  folders: FolderNode[]
  selected: MediaAsset | null
  usage: AssetUsage[]
  extnames: string[]
}>

type View = 'grid' | 'list'

const TYPES = [
  ['', 'All'],
  ['images', 'Images'],
  ['video', 'Video'],
  ['audio', 'Audio'],
  ['documents', 'Documents'],
]

function useView() {
  const [view, setView] = useState<View>('grid')
  useEffect(() => {
    try {
      if (window.localStorage.getItem('media.view') === 'list') setView('list')
    } catch {}
  }, [])
  function change(next: View) {
    setView(next)
    try {
      window.localStorage.setItem('media.view', next)
    } catch {}
  }
  return [view, change] as const
}

function summarize(outcomes: UploadOutcome[]) {
  const uploaded = outcomes.reduce((sum, outcome) => sum + outcome.assets.length, 0)
  const failed = outcomes.reduce((sum, outcome) => sum + outcome.failures.length, 0)
  if (uploaded) toast.success(uploaded === 1 ? 'File uploaded' : `${uploaded} files uploaded`)
  if (failed)
    toast.error(
      failed === 1 ? '1 file couldn’t be uploaded' : `${failed} files couldn’t be uploaded`
    )
}

function FolderCrumbs({ folder }: { folder: string }) {
  const parts = folder === '/' ? [] : folder.slice(1).split('/')
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          {parts.length ? (
            <BreadcrumbLink asChild>
              <Link href={folderHref('/')}>Library</Link>
            </BreadcrumbLink>
          ) : (
            <BreadcrumbPage>Library</BreadcrumbPage>
          )}
        </BreadcrumbItem>
        {parts.map((part, index) => {
          const path = `/${parts.slice(0, index + 1).join('/')}`
          return (
            <Fragment key={path}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {index === parts.length - 1 ? (
                  <BreadcrumbPage>{part}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={folderHref(path)}>{part}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}

function SubfolderCards({ folders, current }: { folders: FolderNode[]; current: string }) {
  const children = folders.filter((folder) => folder.parent === current && folder.path !== '/')
  if (!children.length) return null
  return (
    <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
      {children.map((folder) => (
        <Link
          key={folder.path}
          href={folderHref(folder.path)}
          className="bg-card hover:bg-accent/60 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors"
          data-testid="subfolder"
        >
          <Folder className="text-muted-foreground size-4 shrink-0" />
          <span className="truncate font-medium">{folder.name}</span>
          <span className="text-muted-foreground ml-auto text-xs tabular-nums">{folder.count}</span>
        </Link>
      ))}
    </div>
  )
}

export default function MediaIndex({
  assets,
  meta,
  filters,
  folders,
  selected,
  usage,
  extnames,
}: Props) {
  const can = useCan()
  const canWrite = can('assets:write')
  const canDelete = can('assets:delete')
  const { visit } = useListUrl()
  const [view, setView] = useView()
  const [openId, setOpenId] = useState<number | null>(selected?.id ?? null)
  const [dragging, setDragging] = useState(false)
  const [moving, setMoving] = useState(false)
  const [trashing, setTrashing] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const selection = useSelection(assets.map((asset) => asset.id))
  const browsing = !filters.search && !filters.missingAlt
  const queue = useUploadQueue({
    folder: filters.folder,
    onFinished: (outcomes) => {
      summarize(outcomes)
      router.reload({ only: ['assets', 'meta', 'folders'] })
    },
  })

  function open(id: number | null) {
    setOpenId(id)
    router.get(
      window.location.pathname + window.location.search.replace(/[?&]selected=\d+/, ''),
      id ? { selected: id } : {},
      { preserveState: true, preserveScroll: true, replace: true, only: ['selected', 'usage'] }
    )
  }

  function bulk(action: 'move' | 'trash', folder?: string) {
    router.post(
      urlFor('admin.media.bulk'),
      { action, ids: selection.ids, folder },
      {
        preserveScroll: true,
        onSuccess: () => {
          selection.clear()
          setMoving(false)
          setTrashing(false)
        },
      }
    )
  }

  function dragStart(event: DragEvent, id: number) {
    const ids = selection.isSelected(id) ? selection.ids : [id]
    event.dataTransfer.setData(DRAG_TYPE, JSON.stringify(ids))
    event.dataTransfer.effectAllowed = 'move'
  }

  const current =
    openId === null
      ? null
      : (assets.find((asset) => asset.id === openId) ?? (selected?.id === openId ? selected : null))
  const filtered = Boolean(filters.search || filters.type || filters.missingAlt)

  const columns: Column<MediaAsset>[] = [
    {
      id: 'title',
      label: 'File',
      primary: true,
      sort: 'title',
      cell: (asset) => (
        <button
          type="button"
          draggable={canWrite}
          onDragStart={(event) => dragStart(event, asset.id)}
          onClick={() => open(asset.id)}
          className="flex items-center gap-3 text-left"
        >
          <span className="size-12 shrink-0 overflow-hidden rounded-md border">
            <AssetThumb asset={asset} sizes="48px" iconClassName="size-5" />
          </span>
          <span className="grid min-w-0">
            <span className="truncate font-medium hover:underline">{asset.displayTitle}</span>
            <span className="text-muted-foreground truncate text-xs">{asset.filename}</span>
          </span>
        </button>
      ),
    },
    {
      id: 'folder',
      label: 'Folder',
      cell: (asset) => (
        <Link href={folderHref(asset.folder)} className="text-muted-foreground hover:underline">
          {asset.folder === '/' ? 'Library' : asset.folder}
        </Link>
      ),
    },
    {
      id: 'alt',
      label: 'Alt text',
      cell: (asset) =>
        asset.isImage ? (
          asset.alt ? (
            <span className="line-clamp-2 text-sm">{asset.alt}</span>
          ) : (
            <span className="text-amber-600 dark:text-amber-500 text-sm">Missing</span>
          )
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: 'size',
      label: 'Size',
      sort: 'size',
      defaultOrder: 'desc',
      className: 'tabular-nums text-muted-foreground',
      cell: (asset) => (
        <>
          {formatBytes(asset.size)}
          {asset.width && asset.height && (
            <div className="text-xs">
              {asset.width} × {asset.height}
            </div>
          )}
        </>
      ),
    },
    {
      id: 'date',
      label: 'Uploaded',
      sort: 'date',
      defaultOrder: 'desc',
      className: 'text-muted-foreground',
      cell: (asset) => formatDate(asset.createdAt),
    },
  ]

  return (
    <div
      onDragOver={(event) => {
        if (!canWrite || !event.dataTransfer.types.includes('Files')) return
        event.preventDefault()
        setDragging(true)
      }}
      onDragLeave={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node)) return
        setDragging(false)
      }}
      onDrop={(event) => {
        if (!event.dataTransfer.types.includes('Files')) return
        event.preventDefault()
        setDragging(false)
        if (canWrite) queue.add(event.dataTransfer.files)
      }}
      className="relative min-h-[60vh]"
    >
      <Head title="Media" />
      <ListHeader
        title="Media"
        count={meta.total}
        search={filters.search}
        addNew={
          canWrite && {
            href: `${urlFor('admin.media.create')}${filters.folder === '/' ? '' : `?folder=${encodeURIComponent(filters.folder)}`}`,
            label: 'Add new',
          }
        }
        description="Images and files for pages, entries and globals. Drop files anywhere here to upload them into the open folder."
        actions={
          canWrite && (
            <>
              <Button size="sm" onClick={() => fileInput.current?.click()}>
                <Upload />
                Upload
              </Button>
              <input
                ref={fileInput}
                type="file"
                multiple
                accept={extnames.map((ext) => `.${ext}`).join(',')}
                className="hidden"
                data-testid="media-upload"
                onChange={(event) => {
                  queue.add(event.target.files)
                  event.target.value = ''
                }}
              />
            </>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="sticky top-4 grid gap-2">
            <span className="text-muted-foreground px-1 text-xs font-medium tracking-wide uppercase">
              Folders
            </span>
            <FolderTree
              folders={folders}
              current={browsing ? filters.folder : ''}
              canMove={canWrite}
            />
            {canWrite && (
              <p className="text-muted-foreground px-1 text-xs">
                Drag files onto a folder to move them.
              </p>
            )}
          </div>
        </aside>

        <section className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            {browsing ? (
              <FolderCrumbs folder={filters.folder} />
            ) : (
              <p className="text-muted-foreground text-sm">
                {filters.missingAlt
                  ? 'Images without alt text, in every folder'
                  : 'Results from every folder'}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-1">
              <div className="w-full sm:w-48 lg:hidden">
                <FolderSelect
                  value={filters.folder}
                  folders={folders}
                  onChange={(folder) => router.get(folderHref(folder))}
                />
              </div>
              {browsing && canWrite && (
                <NewFolderDialog
                  parent={filters.folder}
                  trigger={
                    <Button variant="outline" size="sm">
                      <FolderPlus />
                      New folder
                    </Button>
                  }
                />
              )}
              {browsing && filters.folder !== '/' && canWrite && (
                <EditFolderDialog
                  key={filters.folder}
                  path={filters.folder}
                  folders={folders}
                  trigger={
                    <Button variant="outline" size="sm">
                      <Pencil />
                      Rename
                    </Button>
                  }
                />
              )}
              {browsing && filters.folder !== '/' && canDelete && (
                <DeleteFolderDialog
                  path={filters.folder}
                  trigger={
                    <Button variant="outline" size="icon-sm" aria-label="Delete folder">
                      <Trash2 />
                    </Button>
                  }
                />
              )}
            </div>
          </div>

          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Tabs
              value={filters.type || 'all'}
              onValueChange={(type) => visit({ type: type === 'all' ? '' : type })}
            >
              <TabsList>
                {TYPES.map(([value, label]) => (
                  <TabsTrigger key={value || 'all'} value={value || 'all'}>
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <Button
              variant={filters.missingAlt ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => visit({ missingAlt: filters.missingAlt ? '' : '1' })}
              aria-pressed={filters.missingAlt}
            >
              <ImageOff />
              Missing alt text
            </Button>
            <div className="ml-auto flex items-center gap-2">
              <Tabs value={view} onValueChange={(next) => setView(next as View)}>
                <TabsList>
                  <TabsTrigger value="grid" aria-label="Grid view">
                    <LayoutGrid />
                  </TabsTrigger>
                  <TabsTrigger value="list" aria-label="List view">
                    <List />
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <ListSearch value={filters.search} placeholder="Search all files…" />
            </div>
          </div>

          {(canWrite || canDelete) && assets.length > 0 && (
            <div
              className="mb-3 flex min-h-9 flex-wrap items-center gap-2 rounded-lg border px-3 py-1.5"
              data-testid="bulk-bar"
            >
              <SelectCheckbox
                checked={selection.allState}
                onCheckedChange={selection.toggleAll}
                label="Select all"
              />
              <span className="text-muted-foreground text-sm tabular-nums">
                {selection.count ? `${selection.count} selected` : 'Select files for bulk actions'}
              </span>
              {selection.count > 0 && (
                <div className="ml-auto flex flex-wrap gap-2">
                  {canWrite && (
                    <Button variant="outline" size="sm" onClick={() => setMoving(true)}>
                      Move to folder…
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive"
                      onClick={() => setTrashing(true)}
                    >
                      <Trash2 />
                      Move to trash
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={selection.clear}>
                    <X />
                    Clear
                  </Button>
                </div>
              )}
            </div>
          )}

          <UploadQueue items={queue.items} onClear={queue.clearFinished} className="mb-4" />

          {browsing && !filters.type && (
            <SubfolderCards folders={folders} current={filters.folder} />
          )}

          {assets.length === 0 ? (
            <ListEmpty
              filtered={filtered}
              resetHref={folderHref(filters.folder)}
              icon={<ImageIcon className="size-8" />}
              title={filters.folder === '/' ? 'No files yet' : 'No files in this folder'}
              description="Drop images, PDFs, videos, documents or a .zip of them here to upload."
              action={
                canWrite && (
                  <Button variant="outline" onClick={() => fileInput.current?.click()}>
                    <Upload />
                    Upload files
                  </Button>
                )
              }
            />
          ) : view === 'list' ? (
            <ListTable
              rows={assets}
              rowKey={(asset) => asset.id}
              rowLabel={(asset) => asset.displayTitle}
              columns={columns}
              selection={canWrite || canDelete ? selection : null}
              sort={{ sort: filters.sort, order: filters.order }}
            />
          ) : (
            <ul
              className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6"
              data-testid="media-grid"
            >
              {assets.map((asset) => {
                const picked = selection.isSelected(asset.id)
                return (
                  <li
                    key={asset.id}
                    className={cn(
                      'group bg-card relative overflow-hidden rounded-xl border transition',
                      'hover:ring-ring hover:ring-2',
                      (picked || openId === asset.id) && 'ring-primary ring-2'
                    )}
                    data-list-item
                  >
                    <button
                      type="button"
                      draggable={canWrite}
                      onDragStart={(event) => dragStart(event, asset.id)}
                      onClick={() => open(asset.id)}
                      className="block w-full text-left"
                    >
                      <div className="bg-muted aspect-square overflow-hidden">
                        <AssetThumb asset={asset} />
                      </div>
                      <div className="px-2.5 py-2">
                        <div className="truncate text-xs font-medium">{asset.displayTitle}</div>
                        <div className="text-muted-foreground flex justify-between gap-2 truncate text-[11px]">
                          <span className="truncate">
                            {asset.width && asset.height
                              ? `${asset.width} × ${asset.height}`
                              : asset.mimeType}
                          </span>
                          {asset.isImage && !asset.alt && (
                            <span
                              className="text-amber-600 dark:text-amber-500"
                              title="No alt text"
                            >
                              no alt
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                    {(canWrite || canDelete) && (
                      <div
                        className={cn(
                          'bg-background/90 absolute top-2 left-2 rounded p-1 shadow-sm transition-opacity',
                          picked
                            ? 'opacity-100'
                            : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100'
                        )}
                      >
                        <SelectCheckbox
                          checked={picked}
                          onCheckedChange={() => selection.toggle(asset.id)}
                          label={`Select ${asset.displayTitle}`}
                          data-list-select
                        />
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}

          <Pagination meta={meta} noun="files" />
        </section>
      </div>

      {dragging && (
        <div className="bg-background/80 border-primary pointer-events-none fixed inset-0 z-50 m-4 flex items-center justify-center rounded-2xl border-2 border-dashed backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2 text-center">
            <Upload className="text-primary size-10" />
            <p className="text-lg font-medium">Drop to upload</p>
            <p className="text-muted-foreground text-sm">
              Into {filters.folder === '/' ? 'the library' : filters.folder}. Zip files are unpacked
              into a folder.
            </p>
          </div>
        </div>
      )}

      <MoveDialog
        open={moving}
        onOpenChange={setMoving}
        count={selection.count}
        folders={folders}
        current={filters.folder}
        onMove={(folder) => bulk('move', folder)}
      />
      <AlertDialog open={trashing} onOpenChange={setTrashing}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Move {selection.count} {selection.count === 1 ? 'file' : 'files'} to the trash?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Pages that use them show nothing until you restore them from the trash.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={(event) => {
                event.preventDefault()
                bulk('trash')
              }}
            >
              Move to trash
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AssetDetailsSheet
        asset={current}
        usage={selected?.id === openId ? usage : []}
        usageLoaded={selected?.id === openId}
        folders={folders}
        onOpenChange={(isOpen) => !isOpen && open(null)}
      />
    </div>
  )
}
