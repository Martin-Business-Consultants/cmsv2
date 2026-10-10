import { useState } from 'react'
import { router } from '@inertiajs/react'
import { Button } from '~/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
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
import type { RowKey, Selection } from './use_selection'

export type BulkAction = {
  value: string
  label: string
  destructive?: boolean
  confirm?: { title: string; description?: string; label?: string }
}

export default function BulkActions<K extends RowKey>({
  url,
  selection,
  actions,
  noun,
}: {
  url: string
  selection: Selection<K>
  actions: (BulkAction | false | null | undefined)[]
  noun: [string, string]
}) {
  const available = actions.filter((action): action is BulkAction => Boolean(action))
  const [value, setValue] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [processing, setProcessing] = useState(false)
  const chosen = available.find((action) => action.value === value)

  if (!available.length) return null

  function send() {
    if (!chosen) return
    router.post(
      url,
      { action: chosen.value, ids: selection.ids },
      {
        preserveScroll: true,
        onStart: () => setProcessing(true),
        onFinish: () => {
          setProcessing(false)
          setConfirming(false)
        },
        onSuccess: () => {
          selection.clear()
          setValue('')
        },
      }
    )
  }

  function apply() {
    if (!chosen || !selection.count) return
    if (chosen.confirm) setConfirming(true)
    else send()
  }

  const count = selection.count
  const name = count === 1 ? noun[0] : noun[1]

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={value} onValueChange={setValue}>
        <SelectTrigger size="sm" className="w-44" aria-label="Bulk actions">
          <SelectValue placeholder="Bulk actions" />
        </SelectTrigger>
        <SelectContent>
          {available.map((action) => (
            <SelectItem
              key={action.value}
              value={action.value}
              className={action.destructive ? 'text-destructive focus:text-destructive' : undefined}
            >
              {action.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="outline"
        size="sm"
        disabled={!chosen || !count || processing}
        onClick={apply}
        data-bulk-apply
      >
        Apply
      </Button>
      {count > 0 && (
        <span className="text-muted-foreground text-sm tabular-nums">
          {count} {name} selected
        </span>
      )}
      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {chosen?.confirm?.title.replace('{count}', String(count)).replace('{noun}', name)}
            </AlertDialogTitle>
            {chosen?.confirm?.description && (
              <AlertDialogDescription>{chosen.confirm.description}</AlertDialogDescription>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant={chosen?.destructive ? 'destructive' : 'default'}
              disabled={processing}
              onClick={(event) => {
                event.preventDefault()
                send()
              }}
            >
              {chosen?.confirm?.label ?? chosen?.label}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
