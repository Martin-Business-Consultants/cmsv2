import { useState, type ReactNode } from 'react'
import { router } from '@inertiajs/react'
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

export default function ConfirmButton({
  trigger,
  title,
  description,
  confirmLabel,
  href,
  method,
  destructive = false,
}: {
  trigger: ReactNode
  title: string
  description: ReactNode
  confirmLabel: string
  href: string
  method: 'post' | 'delete'
  destructive?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [processing, setProcessing] = useState(false)

  function confirm() {
    router.visit(href, {
      method,
      preserveScroll: true,
      preserveState: true,
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
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant={destructive ? 'destructive' : 'default'}
            disabled={processing}
            onClick={(event) => {
              event.preventDefault()
              confirm()
            }}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
