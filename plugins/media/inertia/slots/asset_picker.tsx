import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Folder, Loader2, Search, Upload } from 'lucide-react'
import type { AssetOption } from '#types/content'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '~/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import { getJson } from '~/lib/http'
import { cn } from '~/lib/utils'
import { urlFor } from '~/client'
import AssetThumb from '../components/asset_thumb'
import { uploadFile } from '../lib/upload'
import type { FolderNode } from '../types'

type Lookup = {
  data: AssetOption[]
  folders?: FolderNode[]
  meta: { total: number; currentPage: number; lastPage: number }
}

export type AssetPickerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPick: (asset: AssetOption) => void
}

function useLibrary(open: boolean, params: Record<string, string | number>, refresh: number) {
  const query = JSON.stringify(params)
  const [result, setResult] = useState<{ key: string; lookup: Lookup } | null>(null)
  const key = `${query}#${refresh}`

  useEffect(() => {
    if (!open) return
    let cancelled = false
    const timer = setTimeout(() => {
      getJson<Lookup>(urlFor('admin.media.lookup'), { ...JSON.parse(query), withFolders: 1 })
        .then((lookup) => !cancelled && setResult({ key: `${query}#${refresh}`, lookup }))
        .catch(() => {})
    }, 150)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [open, query, refresh])

  return { lookup: result?.lookup ?? null, loading: result?.key !== key }
}

export default function AssetPicker({ open, onOpenChange, onPick }: AssetPickerProps) {
  const [folder, setFolder] = useState('/')
  const [search, setSearch] = useState('')
  const [type, setType] = useState('')
  const [page, setPage] = useState(1)
  const [refresh, setRefresh] = useState(0)
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const { lookup, loading } = useLibrary(open, { folder, search, type, page }, refresh)
  const folders = lookup?.folders ?? []
  const subfolders = search
    ? []
    : folders.filter((item) => item.parent === folder && item.path !== '/')
  const parent = folder === '/' ? null : folder.slice(0, folder.lastIndexOf('/')) || '/'

  function go(next: Partial<{ folder: string; search: string; type: string }>) {
    if (next.folder !== undefined) setFolder(next.folder)
    if (next.search !== undefined) setSearch(next.search)
    if (next.type !== undefined) setType(next.type)
    setPage(1)
  }

  async function upload(files: FileList | null) {
    if (!files?.length) return
    setError(null)
    const picked: AssetOption[] = []
    const failures: string[] = []
    for (const [index, file] of Array.from(files).entries()) {
      const outcome = await uploadFile(file, {
        folder,
        unzip: false,
        onProgress: (event) =>
          setProgress(Math.round(((index + (event.percent ?? 100) / 100) / files.length) * 100)),
      })
      picked.push(...outcome.assets)
      failures.push(...outcome.failures)
    }
    setProgress(null)
    if (fileInput.current) fileInput.current.value = ''
    if (failures.length) setError(failures.join('; '))
    if (picked.length === 1 && !failures.length) onPick(picked[0])
    else setRefresh((value) => value + 1)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl" data-testid="asset-picker">
        <DialogHeader>
          <DialogTitle>Choose a file</DialogTitle>
          <DialogDescription>Pick from the media library, or upload a new file.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-48 flex-1">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input
              className="pl-8"
              placeholder="Search all files…"
              value={search}
              onChange={(event) => go({ search: event.target.value })}
            />
          </div>
          <Tabs
            value={type || 'all'}
            onValueChange={(value) => go({ type: value === 'all' ? '' : value })}
          >
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="images">Images</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button
            type="button"
            variant="outline"
            disabled={progress !== null}
            onClick={() => fileInput.current?.click()}
          >
            {progress !== null ? <Loader2 className="animate-spin" /> : <Upload />}
            {progress !== null ? `Uploading… ${progress}%` : 'Upload'}
          </Button>
          <input
            ref={fileInput}
            type="file"
            multiple
            className="hidden"
            data-testid="picker-upload"
            onChange={(event) => upload(event.target.files)}
          />
        </div>
        {error && <p className="text-destructive text-sm">{error}</p>}
        {!search && (
          <div className="flex min-h-8 flex-wrap items-center gap-1.5 text-sm">
            {parent !== null && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => go({ folder: parent })}
              >
                <ChevronLeft />
                Up
              </Button>
            )}
            <span className="text-muted-foreground">{folder === '/' ? 'Library' : folder}</span>
            {subfolders.map((item) => (
              <Button
                key={item.path}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => go({ folder: item.path })}
              >
                <Folder />
                {item.name}
              </Button>
            ))}
          </div>
        )}
        <div
          className={cn(
            'grid max-h-[55vh] min-h-40 grid-cols-3 gap-3 overflow-y-auto sm:grid-cols-5',
            loading && 'opacity-60'
          )}
        >
          {(lookup?.data ?? []).map((asset) => (
            <button
              key={asset.id}
              type="button"
              onClick={() => onPick(asset)}
              className="hover:ring-ring group overflow-hidden rounded-lg border text-left hover:ring-2"
            >
              <div className="aspect-square">
                <AssetThumb asset={asset} sizes="160px" iconClassName="size-6" />
              </div>
              <div className="truncate px-2 py-1.5 text-xs">{asset.filename}</div>
            </button>
          ))}
          {lookup && lookup.data.length === 0 && (
            <p className="text-muted-foreground col-span-full py-10 text-center text-sm">
              {search ? 'No files match.' : 'No files in this folder yet.'}
            </p>
          )}
        </div>
        {lookup && lookup.meta.lastPage > 1 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground tabular-nums">
              Page {lookup.meta.currentPage} of {lookup.meta.lastPage}
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label="Previous page"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label="Next page"
                disabled={page >= lookup.meta.lastPage}
                onClick={() => setPage(page + 1)}
              >
                <ChevronRight />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
