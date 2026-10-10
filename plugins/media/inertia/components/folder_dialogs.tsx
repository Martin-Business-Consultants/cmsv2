import { useState, type FormEvent, type ReactNode } from 'react'
import { router, useForm } from '@inertiajs/react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '~/components/ui/alert_dialog'
import FormField from '~/components/admin/form_field'
import { urlFor } from '~/client'
import FolderSelect from './folder_select'
import type { FolderNode } from '../types'

function parentOf(path: string) {
  return path.slice(0, path.lastIndexOf('/')) || '/'
}

function nameOf(path: string) {
  return path.slice(path.lastIndexOf('/') + 1)
}

export function NewFolderDialog({ parent, trigger }: { parent: string; trigger: ReactNode }) {
  const [open, setOpen] = useState(false)
  const form = useForm({ parent, name: '' })

  function submit(event: FormEvent) {
    event.preventDefault()
    form.transform((data) => ({ ...data, parent }))
    form.post(urlFor('admin.media.folders.store'), {
      preserveScroll: true,
      onSuccess: () => {
        setOpen(false)
        form.reset()
      },
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) form.clearErrors()
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>New folder</DialogTitle>
            <DialogDescription>
              {parent === '/' ? 'At the top of the library.' : `Inside ${parent}.`}
            </DialogDescription>
          </DialogHeader>
          <FormField label="Name" htmlFor="folder-name" error={form.errors.name}>
            <Input
              id="folder-name"
              autoFocus
              value={form.data.name}
              onChange={(event) => form.setData('name', event.target.value)}
              placeholder="e.g. Team photos"
            />
          </FormField>
          <DialogFooter>
            <Button type="submit" disabled={form.processing || !form.data.name.trim()}>
              Create folder
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function EditFolderDialog({
  path,
  folders,
  trigger,
}: {
  path: string
  folders: FolderNode[]
  trigger: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const form = useForm({ path, parent: parentOf(path), name: nameOf(path) })

  function submit(event: FormEvent) {
    event.preventDefault()
    form.put(urlFor('admin.media.folders.update'), {
      preserveScroll: true,
      onSuccess: () => setOpen(false),
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) form.setData({ path, parent: parentOf(path), name: nameOf(path) })
        else form.clearErrors()
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Rename or move folder</DialogTitle>
            <DialogDescription>Files and subfolders inside it move along.</DialogDescription>
          </DialogHeader>
          <FormField label="Name" htmlFor="folder-rename" error={form.errors.name}>
            <Input
              id="folder-rename"
              autoFocus
              value={form.data.name}
              onChange={(event) => form.setData('name', event.target.value)}
            />
          </FormField>
          <FormField label="Inside" htmlFor="folder-parent" error={form.errors.parent}>
            <FolderSelect
              id="folder-parent"
              value={form.data.parent}
              folders={folders}
              exclude={path}
              onChange={(parent) => form.setData('parent', parent)}
            />
          </FormField>
          <DialogFooter>
            <Button type="submit" disabled={form.processing || !form.isDirty}>
              Save folder
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function DeleteFolderDialog({ path, trigger }: { path: string; trigger: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [processing, setProcessing] = useState(false)
  const parent = parentOf(path)

  function confirm() {
    router.delete(urlFor('admin.media.folders.destroy'), {
      data: { path },
      preserveScroll: true,
      onStart: () => setProcessing(true),
      onFinish: () => {
        setProcessing(false)
        setOpen(false)
      },
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete the folder “{nameOf(path)}”?</AlertDialogTitle>
          <AlertDialogDescription>
            No files are deleted: everything inside moves up to{' '}
            {parent === '/' ? 'the top of the library' : parent}.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={processing}
            onClick={(event) => {
              event.preventDefault()
              confirm()
            }}
          >
            Delete folder
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function MoveDialog({
  open,
  onOpenChange,
  count,
  folders,
  current,
  onMove,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  count: number
  folders: FolderNode[]
  current: string
  onMove: (folder: string) => void
}) {
  const [target, setTarget] = useState(current)

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (next) setTarget(current)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Move {count} {count === 1 ? 'file' : 'files'}
          </DialogTitle>
          <DialogDescription>Choose the folder they should live in.</DialogDescription>
        </DialogHeader>
        <FolderSelect value={target} folders={folders} onChange={setTarget} />
        <DialogFooter>
          <Button onClick={() => onMove(target)}>Move here</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
