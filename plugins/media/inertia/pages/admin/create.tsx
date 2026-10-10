import { useRef, useState } from 'react'
import { Head, router } from '@inertiajs/react'
import { Upload } from 'lucide-react'
import { toast } from 'sonner'
import type { InertiaProps } from '~/types'
import { Button } from '~/components/ui/button'
import { Card, CardContent } from '~/components/ui/card'
import { Label } from '~/components/ui/label'
import { Switch } from '~/components/ui/switch'
import PageHeader from '~/components/admin/page_header'
import FormField from '~/components/admin/form_field'
import { cn } from '~/lib/utils'
import FolderSelect from '../../components/folder_select'
import { UploadQueue, useUploadQueue } from '../../components/upload_queue'
import { folderHref } from '../../components/folder_tree'
import type { FolderNode } from '../../types'

type Props = InertiaProps<{ folder: string; folders: FolderNode[]; extnames: string[] }>

export default function MediaCreate({ folder: initialFolder, folders, extnames }: Props) {
  const [folder, setFolder] = useState(initialFolder)
  const [unzip, setUnzip] = useState(true)
  const [dragging, setDragging] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const queue = useUploadQueue({
    folder,
    unzip,
    onFinished: (outcomes) => {
      const uploaded = outcomes.reduce((sum, outcome) => sum + outcome.assets.length, 0)
      if (uploaded) toast.success(uploaded === 1 ? 'File uploaded' : `${uploaded} files uploaded`)
      router.reload({ only: ['folders'] })
    },
  })

  return (
    <>
      <Head title="Upload media" />
      <PageHeader
        title="Upload media"
        description="Images up to 50 MB and 100 megapixels each. A .zip of up to 2 GB and 2,000 files is unpacked into a folder named after it."
        back={{ href: folderHref(folder), label: 'Media library' }}
      />
      <div className="grid max-w-3xl gap-6">
        <Card>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            <FormField label="Upload into" htmlFor="upload-folder">
              <FolderSelect
                id="upload-folder"
                value={folder}
                folders={folders}
                onChange={setFolder}
              />
            </FormField>
            <div className="flex items-center gap-3 sm:pt-6">
              <Switch id="upload-unzip" checked={unzip} onCheckedChange={setUnzip} />
              <Label htmlFor="upload-unzip" className="font-normal">
                Unpack .zip files into a folder
              </Label>
            </div>
          </CardContent>
        </Card>
        <div
          onDragOver={(event) => {
            if (!event.dataTransfer.types.includes('Files')) return
            event.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault()
            setDragging(false)
            queue.add(event.dataTransfer.files)
          }}
          className={cn(
            'flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-16 text-center transition-colors',
            dragging ? 'border-primary bg-primary/5' : 'border-border'
          )}
          data-testid="dropzone"
        >
          <Upload className="text-muted-foreground size-10" />
          <div>
            <p className="font-medium">Drop files here</p>
            <p className="text-muted-foreground text-sm">or</p>
          </div>
          <Button onClick={() => fileInput.current?.click()}>Select files</Button>
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
          <p className="text-muted-foreground max-w-md text-xs">
            {extnames.map((ext) => ext.toUpperCase()).join(', ')}
          </p>
        </div>
        <UploadQueue items={queue.items} onClear={queue.clearFinished} />
        {queue.items.length > 0 && !queue.busy && (
          <Button asChild variant="outline" className="w-fit">
            <a href={folderHref(folder)}>Open the library</a>
          </Button>
        )}
      </div>
    </>
  )
}
