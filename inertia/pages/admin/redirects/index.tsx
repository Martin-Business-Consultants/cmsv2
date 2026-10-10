import { useState, type FormEvent } from 'react'
import { Head, router, useForm } from '@inertiajs/react'
import { ArrowRight, Plus, Signpost } from 'lucide-react'
import type { Data } from '@generated/data'
import type { InertiaProps } from '~/types'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Textarea } from '~/components/ui/textarea'
import { Switch } from '~/components/ui/switch'
import { Badge } from '~/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import FormField from '~/components/admin/form_field'
import {
  BulkActions,
  ListEmpty,
  ListHeader,
  ListSearch,
  ListTable,
  ListToolbar,
  Pagination,
  RowActionButton,
  RowActionConfirm,
  RowActions,
  ScreenOptions,
  StatusLinks,
  useScreenOptions,
  useSelection,
  type Column,
  type ListMeta,
} from '~/components/admin/list'
import { useCan } from '~/hooks/use_can'
import { formatDateTime } from '~/lib/format'
import { cn } from '~/lib/utils'
import { urlFor } from '~/client'

type Redirect = Data.Redirect

type Props = InertiaProps<{
  redirects: Redirect[]
  meta: ListMeta
  counts: { all: number; active: number; inactive: number }
  filters: { search: string; state: string; sort: string; order: 'asc' | 'desc' }
}>

type RedirectFormData = {
  source: string
  destination: string
  statusCode: number
  isActive: boolean
  notes: string
}

const STATUS_CODES = [
  { value: 301, label: 'Moved permanently' },
  { value: 302, label: 'Found (temporary)' },
  { value: 307, label: 'Temporary redirect' },
  { value: 308, label: 'Permanent redirect' },
]

const EMPTY: RedirectFormData = {
  source: '',
  destination: '',
  statusCode: 301,
  isActive: true,
  notes: '',
}

function payloadFor(redirect: Redirect): RedirectFormData {
  return {
    source: redirect.source,
    destination: redirect.destination,
    statusCode: redirect.statusCode,
    isActive: redirect.isActive,
    notes: redirect.notes ?? '',
  }
}

function StatusCodeSelect({
  id,
  value,
  onChange,
}: {
  id?: string
  value: number
  onChange: (value: number) => void
}) {
  return (
    <Select value={String(value)} onValueChange={(next) => onChange(Number(next))}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUS_CODES.map((code) => (
          <SelectItem key={code.value} value={String(code.value)}>
            <span className="font-mono">{code.value}</span>
            <span className="text-muted-foreground">{code.label}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function RedirectDialog({
  redirect,
  open,
  onOpenChange,
}: {
  redirect: Redirect | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const form = useForm<RedirectFormData>(redirect ? payloadFor(redirect) : EMPTY)
  const key = redirect?.id ?? 'new'

  function submit(event: FormEvent) {
    event.preventDefault()
    const options = { preserveScroll: true, onSuccess: () => onOpenChange(false) }
    if (redirect) form.put(urlFor('admin.redirects.update', { id: redirect.id }), options)
    else form.post(urlFor('admin.redirects.store'), options)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>{redirect ? 'Edit redirect' : 'Add redirect'}</DialogTitle>
            <DialogDescription>
              {redirect
                ? 'Changes apply to the next visitor who requests the old path.'
                : 'Send visitors from an old or moved URL to the right place.'}
            </DialogDescription>
          </DialogHeader>
          <FormField
            label="From"
            htmlFor={`source-${key}`}
            error={form.errors.source}
            help="A path like /old-page, or /old-blog/* to match everything below it."
          >
            <Input
              id={`source-${key}`}
              className="font-mono"
              placeholder="/old-page"
              value={form.data.source}
              onChange={(event) => form.setData('source', event.target.value)}
            />
          </FormField>
          <FormField
            label="To"
            htmlFor={`destination-${key}`}
            error={form.errors.destination}
            help="A path or full URL. Wildcards can use :splat, e.g. /blog/:splat."
          >
            <Input
              id={`destination-${key}`}
              className="font-mono"
              placeholder="/new-page"
              value={form.data.destination}
              onChange={(event) => form.setData('destination', event.target.value)}
            />
          </FormField>
          <FormField label="Type" htmlFor={`status-${key}`} error={form.errors.statusCode}>
            <StatusCodeSelect
              id={`status-${key}`}
              value={form.data.statusCode}
              onChange={(value) => form.setData('statusCode', value)}
            />
          </FormField>
          <FormField
            label="Notes"
            htmlFor={`notes-${key}`}
            error={form.errors.notes}
            help="Only visible here, e.g. why the redirect exists."
          >
            <Textarea
              id={`notes-${key}`}
              rows={3}
              value={form.data.notes}
              onChange={(event) => form.setData('notes', event.target.value)}
            />
          </FormField>
          <label className="flex items-center justify-between gap-4 rounded-lg border p-3">
            <span className="grid gap-0.5">
              <span className="text-sm font-medium">Active</span>
              <span className="text-muted-foreground text-xs">
                Inactive redirects are kept but not applied.
              </span>
            </span>
            <Switch
              checked={form.data.isActive}
              onCheckedChange={(checked) => form.setData('isActive', checked)}
            />
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={form.processing || (!!redirect && !form.isDirty)}>
              {form.processing ? 'Saving…' : redirect ? 'Save redirect' : 'Add redirect'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ActiveSwitch({ redirect, disabled }: { redirect: Redirect; disabled: boolean }) {
  const [pending, setPending] = useState(false)

  function toggle(isActive: boolean) {
    router.put(
      urlFor('admin.redirects.update', { id: redirect.id }),
      { ...payloadFor(redirect), isActive },
      {
        preserveScroll: true,
        preserveState: true,
        onStart: () => setPending(true),
        onFinish: () => setPending(false),
      }
    )
  }

  return (
    <Switch
      checked={redirect.isActive}
      disabled={disabled || pending}
      onCheckedChange={toggle}
      aria-label={redirect.isActive ? 'Deactivate redirect' : 'Activate redirect'}
    />
  )
}

export default function RedirectsIndex({ redirects, meta, counts, filters }: Props) {
  const can = useCan()
  const canWrite = can('redirects:write')
  const canDelete = can('redirects:delete')
  const selection = useSelection(redirects.map((redirect) => redirect.id))
  const [dialog, setDialog] = useState<{ open: boolean; redirect: Redirect | null; n: number }>({
    open: false,
    redirect: null,
    n: 0,
  })
  const openDialog = (redirect: Redirect | null) =>
    setDialog((current) => ({ open: true, redirect, n: current.n + 1 }))

  const columns: Column<Redirect>[] = [
    {
      id: 'source',
      label: 'From',
      primary: true,
      sort: 'source',
      cell: (redirect) => (
        <div className="max-w-72">
          {canWrite ? (
            <button
              type="button"
              data-list-open
              onClick={() => openDialog(redirect)}
              className={cn(
                'block max-w-full truncate text-left font-mono text-xs font-medium underline-offset-2 hover:underline',
                !redirect.isActive && 'text-muted-foreground'
              )}
              title={redirect.source}
            >
              {redirect.source}
            </button>
          ) : (
            <div className="truncate font-mono text-xs font-medium" title={redirect.source}>
              {redirect.source}
            </div>
          )}
          {redirect.notes && (
            <div className="text-muted-foreground mt-1 truncate text-xs" title={redirect.notes}>
              {redirect.notes}
            </div>
          )}
          <RowActions>
            {canWrite && (
              <RowActionButton keys="e" onClick={() => openDialog(redirect)}>
                Edit
              </RowActionButton>
            )}
            {canWrite && (
              <RowActionButton
                onClick={() =>
                  router.post(
                    urlFor('admin.redirects.bulk'),
                    { action: redirect.isActive ? 'deactivate' : 'activate', ids: [redirect.id] },
                    { preserveScroll: true }
                  )
                }
              >
                {redirect.isActive ? 'Deactivate' : 'Activate'}
              </RowActionButton>
            )}
            {canDelete && (
              <RowActionConfirm
                href={urlFor('admin.redirects.destroy', { id: redirect.id })}
                title="Delete this redirect?"
                description={
                  <>
                    Visitors to <span className="font-mono">{redirect.source}</span> will no longer
                    be redirected. This can’t be undone.
                  </>
                }
                confirmLabel="Delete"
                keys="d"
              >
                Delete
              </RowActionConfirm>
            )}
          </RowActions>
        </div>
      ),
    },
    {
      id: 'destination',
      label: 'To',
      sort: 'destination',
      cell: (redirect) => (
        <div
          className={cn(
            'flex max-w-72 items-center gap-2 font-mono text-xs',
            !redirect.isActive && 'text-muted-foreground line-through'
          )}
        >
          <ArrowRight className="text-muted-foreground size-3.5 shrink-0" />
          <span className="truncate" title={redirect.destination}>
            {redirect.destination}
          </span>
        </div>
      ),
    },
    {
      id: 'type',
      label: 'Type',
      cell: (redirect) => (
        <Badge
          variant={
            redirect.statusCode === 301 || redirect.statusCode === 308 ? 'secondary' : 'outline'
          }
          className="font-mono"
          title={STATUS_CODES.find((code) => code.value === redirect.statusCode)?.label}
        >
          {redirect.statusCode}
        </Badge>
      ),
    },
    {
      id: 'active',
      label: 'Active',
      cell: (redirect) => <ActiveSwitch redirect={redirect} disabled={!canWrite} />,
    },
    {
      id: 'hits',
      label: 'Hits',
      sort: 'hits',
      defaultOrder: 'desc',
      className: 'tabular-nums',
      cell: (redirect) => redirect.hits.toLocaleString(),
    },
    {
      id: 'lastHit',
      label: 'Last hit',
      sort: 'lastHit',
      defaultOrder: 'desc',
      className: 'text-muted-foreground text-sm whitespace-nowrap',
      cell: (redirect) => (redirect.lastHitAt ? formatDateTime(redirect.lastHitAt) : 'Never'),
    },
  ]
  const screen = useScreenOptions('redirects', columns)

  return (
    <>
      <Head title="Redirects" />
      <ListHeader
        title="Redirects"
        search={filters.search}
        description="Send visitors from old or moved URLs to the right place."
        actions={
          canWrite && (
            <Button
              variant="outline"
              size="sm"
              data-keys="n"
              title="Add New Redirect (n)"
              onClick={() => openDialog(null)}
            >
              <Plus />
              Add New Redirect
            </Button>
          )
        }
        aside={<ScreenOptions screen={screen} />}
      />
      <StatusLinks
        param="state"
        current={filters.state}
        options={[
          { label: 'All', value: '', count: counts.all },
          { label: 'Active', value: 'active', count: counts.active },
          { label: 'Inactive', value: 'inactive', count: counts.inactive, hideWhenEmpty: true },
        ]}
      />
      <ListToolbar search={<ListSearch value={filters.search} placeholder="Search redirects…" />}>
        <BulkActions
          url={urlFor('admin.redirects.bulk')}
          selection={selection}
          noun={['redirect', 'redirects']}
          actions={[
            canWrite && { value: 'activate', label: 'Activate' },
            canWrite && { value: 'deactivate', label: 'Deactivate' },
            canDelete && {
              value: 'delete',
              label: 'Delete',
              destructive: true,
              confirm: {
                title: 'Delete {count} {noun}?',
                description:
                  "Visitors to these paths will no longer be redirected. This can't be undone.",
                label: 'Delete',
              },
            },
          ]}
        />
      </ListToolbar>
      {redirects.length === 0 ? (
        <ListEmpty
          filtered={Boolean(filters.search || filters.state)}
          resetHref={urlFor('admin.redirects.index')}
          icon={<Signpost className="size-8" />}
          title="No redirects yet"
          description="Add a redirect when you move or remove a page, so old links keep working."
        />
      ) : (
        <ListTable
          rows={redirects}
          rowKey={(redirect) => redirect.id}
          rowLabel={(redirect) => redirect.source}
          columns={columns}
          screen={screen}
          selection={canWrite || canDelete ? selection : null}
          sort={filters}
        />
      )}
      <Pagination meta={meta} />
      {canWrite && (
        <RedirectDialog
          key={dialog.n}
          redirect={dialog.redirect}
          open={dialog.open}
          onOpenChange={(open) => setDialog((current) => ({ ...current, open }))}
        />
      )}
    </>
  )
}
