import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, FileArchive, FileIcon, Loader2, X } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { formatBytes } from '~/lib/format'
import { cn } from '~/lib/utils'
import { uploadFile, type UploadOutcome, type UploadProgress } from '../lib/upload'

export type QueueItem = {
  id: string
  name: string
  size: number
  archive: boolean
  stage: UploadProgress['stage'] | 'queued' | 'done' | 'failed'
  percent: number | null
  message: string | null
}

const PARALLEL = 3

export function useUploadQueue({
  folder,
  unzip = true,
  onFinished,
}: {
  folder: string
  unzip?: boolean
  onFinished?: (outcomes: UploadOutcome[]) => void
}) {
  const [items, setItems] = useState<QueueItem[]>([])
  const running = useRef(0)
  const pending = useRef<{ id: string; file: File }[]>([])
  const outcomes = useRef<UploadOutcome[]>([])
  const settings = useRef({ folder, unzip, onFinished })
  useEffect(() => {
    settings.current = { folder, unzip, onFinished }
  })

  const update = useCallback(
    (id: string, changes: Partial<QueueItem>) =>
      setItems((current) =>
        current.map((item) => (item.id === id ? { ...item, ...changes } : item))
      ),
    []
  )

  const pump = useCallback(() => {
    while (running.current < PARALLEL && pending.current.length) {
      const { id, file } = pending.current.shift()!
      running.current++
      uploadFile(file, {
        folder: settings.current.folder,
        unzip: settings.current.unzip,
        onProgress: (progress) => update(id, progress),
      })
        .then((outcome) => {
          outcomes.current.push(outcome)
          const failed = outcome.assets.length === 0 && outcome.failures.length > 0
          const archive = file.name.toLowerCase().endsWith('.zip') && settings.current.unzip
          update(id, {
            stage: failed ? 'failed' : 'done',
            percent: 100,
            message: failed
              ? outcome.failures.join('; ')
              : archive
                ? `${outcome.assets.length} files unpacked into ${outcome.folder}${outcome.failures.length ? `, ${outcome.failures.length} failed` : ''}${outcome.skipped ? `, ${outcome.skipped} skipped` : ''}`
                : null,
          })
        })
        .finally(() => {
          running.current--
          if (running.current === 0 && pending.current.length === 0) {
            settings.current.onFinished?.(outcomes.current)
            outcomes.current = []
          }
          pump()
        })
    }
  }, [update])

  const add = useCallback(
    (files: FileList | File[] | null) => {
      if (!files?.length) return
      const added = Array.from(files).map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
      }))
      setItems((current) => [
        ...current,
        ...added.map(({ id, file }) => ({
          id,
          name: file.name,
          size: file.size,
          archive: file.name.toLowerCase().endsWith('.zip') && settings.current.unzip,
          stage: 'queued' as const,
          percent: 0,
          message: null,
        })),
      ])
      pending.current.push(...added)
      pump()
    },
    [pump]
  )

  const clearFinished = useCallback(
    () =>
      setItems((current) =>
        current.filter((item) => item.stage !== 'done' && item.stage !== 'failed')
      ),
    []
  )

  const busy = items.some((item) => item.stage !== 'done' && item.stage !== 'failed')
  return { items, add, busy, clearFinished }
}

function stageLabel(item: QueueItem) {
  if (item.stage === 'queued') return 'Waiting…'
  if (item.stage === 'uploading')
    return item.percent === null ? 'Uploading…' : `Uploading ${item.percent}%`
  if (item.stage === 'processing') {
    if (item.archive) return item.percent === null ? 'Unpacking…' : `Unpacking ${item.percent}%`
    return 'Processing…'
  }
  if (item.stage === 'failed') return 'Failed'
  return 'Uploaded'
}

export function UploadQueue({
  items,
  onClear,
  className,
}: {
  items: QueueItem[]
  onClear?: () => void
  className?: string
}) {
  if (!items.length) return null
  const finished = items.filter((item) => item.stage === 'done' || item.stage === 'failed').length

  return (
    <div className={cn('bg-card rounded-xl border', className)} data-testid="upload-queue">
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <span className="text-sm font-medium">
          Uploads{' '}
          <span className="text-muted-foreground font-normal tabular-nums">
            {finished}/{items.length}
          </span>
        </span>
        {onClear && finished > 0 && (
          <Button variant="ghost" size="sm" onClick={onClear}>
            <X />
            Clear finished
          </Button>
        )}
      </div>
      <ul className="max-h-72 divide-y overflow-y-auto">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-3 px-4 py-2.5">
            {item.archive ? (
              <FileArchive className="text-muted-foreground size-4 shrink-0" />
            ) : (
              <FileIcon className="text-muted-foreground size-4 shrink-0" />
            )}
            <div className="grid min-w-0 flex-1 gap-1">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate">{item.name}</span>
                <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                  {formatBytes(item.size)}
                </span>
              </div>
              {item.stage !== 'done' && item.stage !== 'failed' && (
                <div className="bg-muted h-1 overflow-hidden rounded-full">
                  <div
                    className={cn(
                      'bg-primary h-full transition-all',
                      item.percent === null && 'w-1/3 animate-pulse'
                    )}
                    style={item.percent === null ? undefined : { width: `${item.percent}%` }}
                  />
                </div>
              )}
              <span
                className={cn(
                  'text-xs',
                  item.stage === 'failed' ? 'text-destructive' : 'text-muted-foreground'
                )}
              >
                {item.message ?? stageLabel(item)}
              </span>
            </div>
            {item.stage === 'done' ? (
              <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
            ) : item.stage === 'failed' ? (
              <AlertCircle className="text-destructive size-4 shrink-0" />
            ) : (
              <Loader2 className="text-muted-foreground size-4 shrink-0 animate-spin" />
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
