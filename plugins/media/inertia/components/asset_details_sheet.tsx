import { useRef, useState, type FormEvent } from 'react'
import { router, useForm } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { Check, Copy, Download, RefreshCw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Textarea } from '~/components/ui/textarea'
import { Badge } from '~/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '~/components/ui/sheet'
import FormField from '~/components/admin/form_field'
import ConfirmAction from '~/components/admin/confirm_action'
import { useCan } from '~/hooks/use_can'
import { formatBytes, formatDateTime } from '~/lib/format'
import { urlFor } from '~/client'
import AssetThumb from './asset_thumb'
import FocalPointPicker from './focal_point_picker'
import FolderSelect from './folder_select'
import { replaceFile } from '../lib/upload'
import type { AssetUsage, FolderNode, MediaAsset } from '../types'

const KIND_LABELS = { page: 'Page', entry: 'Entry', global: 'Global' }

function Preview({ asset }: { asset: MediaAsset }) {
  if (asset.mimeType.startsWith('video/')) {
    return <video src={asset.url} controls className="max-h-64 w-full rounded-lg" />
  }
  if (asset.mimeType.startsWith('audio/')) {
    return <audio src={asset.url} controls className="w-full" />
  }
  return (
    <div className="flex h-56 items-center justify-center overflow-hidden rounded-lg">
      <AssetThumb
        asset={{ ...asset, focalX: 0.5, focalY: 0.5 }}
        sizes="420px"
        className="object-contain"
        iconClassName="size-12"
      />
    </div>
  )
}

function CopyUrl({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)
  const absolute = typeof window === 'undefined' ? url : `${window.location.origin}${url}`

  async function copy() {
    await navigator.clipboard.writeText(absolute)
    setCopied(true)
    toast.success('URL copied')
  }

  return (
    <div className="flex gap-2">
      <Input
        readOnly
        value={absolute}
        aria-label="File URL"
        className="font-mono text-xs"
        onFocus={(event) => event.target.select()}
      />
      <Button type="button" variant="outline" size="icon" onClick={copy} aria-label="Copy URL">
        {copied ? <Check /> : <Copy />}
      </Button>
      <Button asChild variant="outline" size="icon" aria-label="Download file">
        <a href={url} download>
          <Download />
        </a>
      </Button>
    </div>
  )
}

function DetailsForm({ asset, folders }: { asset: MediaAsset; folders: FolderNode[] }) {
  const can = useCan()
  const editable = can('assets:write')
  const form = useForm({
    title: asset.title ?? '',
    alt: asset.alt ?? '',
    caption: asset.caption ?? '',
    description: asset.description ?? '',
    folder: asset.folder,
    focalX: asset.focalX,
    focalY: asset.focalY,
  })

  function submit(event: FormEvent) {
    event.preventDefault()
    form.put(urlFor('admin.media.update', { id: asset.id }), {
      preserveScroll: true,
      preserveState: true,
    })
  }

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
      <Tabs defaultValue="details" className="flex-1 gap-4 px-4">
        <TabsList className="w-full">
          <TabsTrigger value="details">Details</TabsTrigger>
          {asset.isImage && <TabsTrigger value="focal">Focal point</TabsTrigger>}
          <TabsTrigger value="file">File</TabsTrigger>
        </TabsList>
        <TabsContent value="details" className="grid gap-4">
          <FormField label="Title" htmlFor="asset-title" error={form.errors.title}>
            <Input
              id="asset-title"
              value={form.data.title}
              disabled={!editable}
              placeholder={asset.filename}
              onChange={(event) => form.setData('title', event.target.value)}
            />
          </FormField>
          {asset.isImage && (
            <FormField
              label="Alt text"
              htmlFor="asset-alt"
              error={form.errors.alt}
              help="Describe the image for people who can’t see it. Leave empty only if it’s decorative."
            >
              <Textarea
                id="asset-alt"
                rows={2}
                value={form.data.alt}
                disabled={!editable}
                onChange={(event) => form.setData('alt', event.target.value)}
              />
            </FormField>
          )}
          <FormField
            label="Caption"
            htmlFor="asset-caption"
            error={form.errors.caption}
            help="Shown with the file on the site."
          >
            <Textarea
              id="asset-caption"
              rows={2}
              value={form.data.caption}
              disabled={!editable}
              onChange={(event) => form.setData('caption', event.target.value)}
            />
          </FormField>
          <FormField
            label="Description"
            htmlFor="asset-description"
            error={form.errors.description}
            help="A note for editors; not shown on the site."
          >
            <Textarea
              id="asset-description"
              rows={3}
              value={form.data.description}
              disabled={!editable}
              onChange={(event) => form.setData('description', event.target.value)}
            />
          </FormField>
          <FormField label="Folder" htmlFor="asset-folder" error={form.errors.folder}>
            <FolderSelect
              id="asset-folder"
              value={form.data.folder}
              folders={folders}
              disabled={!editable}
              onChange={(folder) => form.setData('folder', folder)}
            />
          </FormField>
        </TabsContent>
        {asset.isImage && (
          <TabsContent value="focal" className="grid gap-3">
            <p className="text-muted-foreground text-sm">
              Click the part of the image that must stay in view when it’s cropped to fit.
            </p>
            <FocalPointPicker
              src={asset.url}
              alt={asset.alt ?? ''}
              x={form.data.focalX}
              y={form.data.focalY}
              disabled={!editable}
              onChange={({ x, y }) => form.setData((data) => ({ ...data, focalX: x, focalY: y }))}
            />
          </TabsContent>
        )}
        <TabsContent value="file" className="grid gap-4">
          <FileInfo asset={asset} />
        </TabsContent>
      </Tabs>
      {editable && (
        <SheetFooter className="bg-background sticky bottom-0 border-t">
          <Button type="submit" disabled={form.processing || !form.isDirty}>
            {form.processing ? 'Saving…' : 'Save changes'}
          </Button>
        </SheetFooter>
      )}
    </form>
  )
}

function FileInfo({ asset }: { asset: MediaAsset }) {
  const can = useCan()
  const input = useRef<HTMLInputElement>(null)
  const [progress, setProgress] = useState<number | null>(null)

  async function replace(file: File | undefined) {
    if (!file) return
    setProgress(0)
    try {
      await replaceFile(asset.id, file, (event) => setProgress(event.percent ?? 100))
      toast.success('File replaced')
      router.reload({ only: ['assets', 'selected', 'folders'] })
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setProgress(null)
      if (input.current) input.current.value = ''
    }
  }

  return (
    <>
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
        <dt className="text-muted-foreground">File name</dt>
        <dd className="break-all">{asset.filename}</dd>
        <dt className="text-muted-foreground">Type</dt>
        <dd>{asset.mimeType}</dd>
        {asset.width && asset.height && (
          <>
            <dt className="text-muted-foreground">Dimensions</dt>
            <dd>
              {asset.width} × {asset.height}
            </dd>
          </>
        )}
        <dt className="text-muted-foreground">Size</dt>
        <dd>{formatBytes(asset.size)}</dd>
        <dt className="text-muted-foreground">Uploaded</dt>
        <dd>{formatDateTime(asset.createdAt)}</dd>
        {asset.srcset && (
          <>
            <dt className="text-muted-foreground">Sizes</dt>
            <dd>
              {asset.srcset
                .split(', ')
                .map((entry) => entry.split(' ')[1])
                .join(', ')}
            </dd>
          </>
        )}
      </dl>
      {can('assets:write') && (
        <div className="grid gap-2 rounded-lg border p-3">
          <span className="text-sm font-medium">Replace file</span>
          <p className="text-muted-foreground text-xs">
            Upload a new version. It keeps this file’s id, title, alt text and every place it’s
            used.
          </p>
          <Button
            type="button"
            variant="outline"
            className="w-fit"
            disabled={progress !== null}
            onClick={() => input.current?.click()}
          >
            <RefreshCw className={progress !== null ? 'animate-spin' : undefined} />
            {progress !== null ? `Replacing… ${progress}%` : 'Choose new file'}
          </Button>
          <input
            ref={input}
            type="file"
            className="hidden"
            data-testid="replace-input"
            onChange={(event) => replace(event.target.files?.[0])}
          />
        </div>
      )}
    </>
  )
}

export default function AssetDetailsSheet({
  asset,
  usage,
  usageLoaded,
  folders,
  onOpenChange,
}: {
  asset: MediaAsset | null
  usage: AssetUsage[]
  usageLoaded: boolean
  folders: FolderNode[]
  onOpenChange: (open: boolean) => void
}) {
  const can = useCan()
  const [shown, setShown] = useState(asset)
  if (asset && asset !== shown) setShown(asset)
  const current = asset ?? shown

  return (
    <Sheet open={Boolean(asset)} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-md">
        {current && (
          <>
            <SheetHeader>
              <SheetTitle className="pr-6 break-all">{current.displayTitle}</SheetTitle>
              <SheetDescription>
                {current.folder === '/' ? 'Library' : current.folder} · {formatBytes(current.size)}
              </SheetDescription>
            </SheetHeader>
            <div className="grid gap-4 px-4 pb-4">
              <div className="bg-muted/50 rounded-lg border p-2">
                <Preview asset={current} />
              </div>
              <CopyUrl url={current.url} />
              <div className="grid gap-2">
                <span className="text-sm font-medium">Used in</span>
                {!usageLoaded ? (
                  <p className="text-muted-foreground text-sm">Checking…</p>
                ) : usage.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    Not used in any page, entry or global.
                  </p>
                ) : (
                  <ul className="grid gap-1.5 text-sm" data-testid="asset-usage">
                    {usage.map((item) => (
                      <li key={item.href} className="flex items-center gap-2">
                        <Badge variant="outline">{KIND_LABELS[item.kind]}</Badge>
                        <Link href={item.href} className="truncate hover:underline">
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <DetailsForm
              key={`${current.id}-${current.updatedAt}`}
              asset={current}
              folders={folders}
            />
            {can('assets:delete') && (
              <div className="px-4 py-4">
                <ConfirmAction
                  href={urlFor('admin.media.destroy', { id: current.id })}
                  title="Move this file to the trash?"
                  description={
                    usage.length > 0
                      ? `It’s used in ${usage.length} ${usage.length === 1 ? 'place' : 'places'}, which will show nothing until you restore it from the trash.`
                      : 'You can restore it from the trash until it’s deleted for good.'
                  }
                  confirmLabel="Move to trash"
                  trigger={
                    <Button type="button" variant="ghost" className="text-destructive w-fit">
                      <Trash2 />
                      Move to trash
                    </Button>
                  }
                />
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
