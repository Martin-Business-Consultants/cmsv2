import { createElement, useState, type FormEvent } from 'react'
import { Head, router, useForm } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import {
  ChevronRight,
  Eye,
  EyeOff,
  Plus,
  RefreshCw,
  RotateCw,
  Send,
  Trash2,
  Webhook as WebhookIcon,
} from 'lucide-react'
import type { InertiaProps } from '~/types'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Textarea } from '~/components/ui/textarea'
import { Switch } from '~/components/ui/switch'
import { Badge } from '~/components/ui/badge'
import { Checkbox } from '~/components/ui/checkbox'
import { Separator } from '~/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '~/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '~/components/ui/collapsible'
import FormField from '~/components/admin/form_field'
import ConfirmAction from '~/components/admin/confirm_action'
import CopyField from '~/components/admin/copy_field'
import {
  ListEmpty,
  ListHeader,
  ListSearch,
  ListTable,
  ListToolbar,
  Pagination,
  RowAction,
  RowActionButton,
  RowActionConfirm,
  RowActions,
  RowTitle,
  type Column,
  type ListMeta,
} from '~/components/admin/list'
import { useCan } from '~/hooks/use_can'
import { useSlot } from '~/hooks/use_slot'
import { formatDateTime } from '~/lib/format'
import { cn } from '~/lib/utils'

type Health = { state: 'inactive' | 'pending' | 'delivering' | 'failing'; label: string }

type Webhook = {
  id: number
  name: string
  url: string
  active: boolean
  events: string[]
  headers: { [name: string]: string }
  headersText: string
  eventFilters: { [event: string]: any }
  failureCount: number
  lastStatus: string | null
  lastDeliveryAt: string | null
  health: Health
  createdAt: string | null
  updatedAt: string | null
  secret?: string
}

type Delivery = {
  id: number
  event: string
  payload: string
  responseStatus: number | null
  responseBody: string | null
  error: string | null
  durationMs: number | null
  attempt: number
  success: boolean
  createdAt: string | null
}

type EventGroup = {
  label: string
  events: string[]
  source: 'core' | 'plugin'
  plugin: string | null
}

type SheetState = { mode: 'new' } | { mode: 'edit'; webhook: Webhook; deliveries: Delivery[] }

type Props = InertiaProps<{
  webhooks: Webhook[]
  meta: ListMeta
  eventGroups: EventGroup[]
  sheet: SheetState | null
  filters: { search: string; sort: string; order: 'asc' | 'desc' }
}>

type WebhookFormData = {
  name: string
  url: string
  active: boolean
  events: string[]
  headersText: string
  eventFilters: { [event: string]: any }
}

const INDEX = '/admin/webhooks'

function HealthBadge({ health }: { health: Health }) {
  if (health.state === 'delivering') {
    return <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">{health.label}</Badge>
  }
  if (health.state === 'failing') return <Badge variant="destructive">{health.label}</Badge>
  if (health.state === 'inactive') {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        {health.label}
      </Badge>
    )
  }
  return <Badge variant="secondary">{health.label}</Badge>
}

function prettyJson(value: string | null) {
  if (!value) return ''
  try {
    return JSON.stringify(JSON.parse(value), null, 2)
  } catch {
    return value
  }
}

function DeliveryRow({ delivery, url }: { delivery: Delivery; url: string }) {
  return (
    <Collapsible className="group/delivery border-b last:border-b-0">
      <CollapsibleTrigger className="hover:bg-muted/50 flex w-full items-center gap-3 px-3 py-2 text-left text-sm">
        <ChevronRight className="text-muted-foreground size-4 shrink-0 transition-transform group-data-[state=open]/delivery:rotate-90" />
        <span className="text-muted-foreground w-36 shrink-0 text-xs whitespace-nowrap">
          {formatDateTime(delivery.createdAt)}
        </span>
        <span className="min-w-0 flex-1 truncate font-mono text-xs">{delivery.event}</span>
        {delivery.attempt > 1 && (
          <span className="text-muted-foreground text-xs whitespace-nowrap">
            try {delivery.attempt}
          </span>
        )}
        {delivery.success ? (
          <Badge className="bg-emerald-600 font-mono text-white hover:bg-emerald-600">
            {delivery.responseStatus ?? 'OK'}
          </Badge>
        ) : (
          <Badge variant="destructive" className="font-mono">
            {delivery.responseStatus ?? 'Failed'}
          </Badge>
        )}
        <span className="text-muted-foreground w-16 shrink-0 text-right text-xs tabular-nums">
          {delivery.durationMs !== null ? `${delivery.durationMs} ms` : ''}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="bg-muted/30 grid gap-3 px-3 pt-1 pb-3 text-xs">
        <div className="grid gap-1">
          <div className="font-medium">Request</div>
          <div className="text-muted-foreground font-mono break-all">POST {url}</div>
          <pre className="bg-background max-h-64 overflow-auto rounded-md border p-2 font-mono text-[11px] leading-relaxed">
            {prettyJson(delivery.payload)}
          </pre>
        </div>
        <div className="grid gap-1">
          <div className="font-medium">Response</div>
          {delivery.error && <div className="text-destructive">{delivery.error}</div>}
          {delivery.responseStatus !== null && (
            <div className="text-muted-foreground font-mono">HTTP {delivery.responseStatus}</div>
          )}
          {delivery.responseBody ? (
            <pre className="bg-background max-h-48 overflow-auto rounded-md border p-2 font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
              {prettyJson(delivery.responseBody)}
            </pre>
          ) : (
            <div className="text-muted-foreground">No response body.</div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

function Deliveries({ webhook, deliveries }: { webhook: Webhook; deliveries: Delivery[] }) {
  const [refreshing, setRefreshing] = useState(false)

  function refresh() {
    router.reload({
      only: ['sheet', 'webhooks'],
      onStart: () => setRefreshing(true),
      onFinish: () => setRefreshing(false),
    })
  }

  return (
    <section className="grid gap-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">Recent deliveries</h3>
          <p className="text-muted-foreground text-xs">
            The latest 20 attempts. Failed deliveries are retried up to three times.
          </p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={refresh} disabled={refreshing}>
          <RefreshCw className={cn(refreshing && 'animate-spin')} />
          Refresh
        </Button>
      </div>
      <div className="overflow-hidden rounded-lg border">
        {deliveries.length ? (
          deliveries.map((delivery) => (
            <DeliveryRow key={delivery.id} delivery={delivery} url={webhook.url} />
          ))
        ) : (
          <p className="text-muted-foreground px-3 py-6 text-center text-sm">
            Nothing delivered yet.
          </p>
        )}
      </div>
    </section>
  )
}

function SecretField({ webhook }: { webhook: Webhook }) {
  const [revealed, setRevealed] = useState(false)
  if (!webhook.secret) return null
  return (
    <section className="grid gap-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Signing secret</h3>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setRevealed((value) => !value)}
          >
            {revealed ? <EyeOff /> : <Eye />}
            {revealed ? 'Hide' : 'Reveal'}
          </Button>
          <ConfirmAction
            trigger={
              <Button type="button" variant="ghost" size="sm">
                <RotateCw />
                Rotate
              </Button>
            }
            title="Rotate the signing secret?"
            description="Deliveries are signed with the new secret straight away. Receivers will need the new value."
            confirmLabel="Rotate secret"
            href={`${INDEX}/${webhook.id}/secret`}
            method="post"
            destructive={false}
          />
        </div>
      </div>
      {revealed ? (
        <CopyField value={webhook.secret} />
      ) : (
        <div className="bg-background text-muted-foreground rounded-md border px-3 py-2 font-mono text-xs tracking-widest">
          whsec_••••••••••••••••••••••••
        </div>
      )}
      <p className="text-muted-foreground text-xs">
        Receivers verify each delivery by comparing{' '}
        <code className="font-mono">X-CMS-Signature</code> with{' '}
        <code className="font-mono">sha256=HMAC_SHA256(raw body, secret)</code>.
      </p>
    </section>
  )
}

function EventPicker({
  groups,
  value,
  onChange,
  disabled,
}: {
  groups: EventGroup[]
  value: string[]
  onChange: (events: string[]) => void
  disabled?: boolean
}) {
  const selected = new Set(value)
  const update = (events: string[], checked: boolean) => {
    const next = new Set(selected)
    for (const event of events) {
      if (checked) next.add(event)
      else next.delete(event)
    }
    onChange(groups.flatMap((group) => group.events).filter((item) => next.has(item)))
  }
  const sections = [
    { label: 'Content', groups: groups.filter((group) => group.source === 'core') },
    { label: 'Plugins', groups: groups.filter((group) => group.source === 'plugin') },
  ].filter((section) => section.groups.length)

  return (
    <div className="grid gap-4">
      {sections.map((section) => (
        <div key={section.label} className="grid gap-2">
          <div className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            {section.label}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {section.groups.map((group) => {
              const all = group.events.every((event) => selected.has(event))
              return (
                <fieldset key={group.label} className="grid gap-1.5 rounded-lg border p-3">
                  <legend className="px-1 text-xs font-medium">{group.label}</legend>
                  {group.events.map((event) => (
                    <label key={event} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={selected.has(event)}
                        disabled={disabled}
                        onCheckedChange={(checked) => update([event], checked === true)}
                      />
                      <span className="font-mono text-xs">{event}</span>
                    </label>
                  ))}
                  {group.events.length > 1 && !disabled && (
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground mt-1 justify-self-start text-xs underline-offset-2 hover:underline"
                      onClick={() => update(group.events, !all)}
                    >
                      {all ? 'Clear' : 'Select all'}
                    </button>
                  )}
                </fieldset>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function WebhookSheet({
  sheet,
  groups,
  onClose,
}: {
  sheet: SheetState
  groups: EventGroup[]
  onClose: () => void
}) {
  const can = useCan()
  const canWrite = can('webhooks:write')
  const canDelete = can('webhooks:delete')
  const webhook = sheet.mode === 'edit' ? sheet.webhook : null
  const FiltersSlot = useSlot('webhook_filters')
  const form = useForm<WebhookFormData>({
    name: webhook?.name ?? '',
    url: webhook?.url ?? '',
    active: webhook?.active ?? true,
    events: webhook?.events ?? [],
    headersText: webhook?.headersText ?? '',
    eventFilters: webhook?.eventFilters ?? {},
  })
  const [testing, setTesting] = useState(false)

  function submit(event: FormEvent) {
    event.preventDefault()
    const options = { preserveScroll: true, onSuccess: () => form.setDefaults() }
    if (webhook) form.put(`${INDEX}/${webhook.id}`, options)
    else form.post(INDEX, options)
  }

  function sendTest() {
    if (!webhook) return
    router.post(
      `${INDEX}/${webhook.id}/test`,
      {},
      {
        preserveScroll: true,
        onStart: () => setTesting(true),
        onFinish: () => setTesting(false),
        onSuccess: () => {
          setTimeout(() => router.reload({ only: ['sheet', 'webhooks'] }), 2500)
        },
      }
    )
  }

  const readOnly = !canWrite

  return (
    <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-2xl">
      <SheetHeader className="border-b">
        <SheetTitle className="flex items-center gap-2">
          {webhook ? webhook.name : 'New webhook'}
          {webhook && <HealthBadge health={webhook.health} />}
        </SheetTitle>
        <SheetDescription>
          {webhook
            ? 'The CMS POSTs a signed JSON payload to this URL when a chosen event happens.'
            : 'Tell another system when content changes: a frontend rebuild, a search index, a chat channel.'}
        </SheetDescription>
        {webhook && (canWrite || canDelete) && (
          <div className="flex flex-wrap items-center gap-2 pt-2">
            {canWrite && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={sendTest}
                disabled={testing}
              >
                <Send />
                {testing ? 'Sending…' : 'Send test'}
              </Button>
            )}
            {canDelete && (
              <ConfirmAction
                trigger={
                  <Button type="button" variant="ghost" size="sm" className="text-destructive">
                    <Trash2 />
                    Delete
                  </Button>
                }
                title={`Delete “${webhook.name}”?`}
                description="Its receiver stops hearing about changes. Its delivery log goes too."
                href={`${INDEX}/${webhook.id}`}
              />
            )}
          </div>
        )}
      </SheetHeader>
      <div className="grid gap-6 p-4">
        {webhook && canWrite && <SecretField webhook={webhook} />}
        <form onSubmit={submit} className="grid gap-5">
          <FormField label="Name" htmlFor="webhook-name" error={form.errors.name}>
            <Input
              id="webhook-name"
              value={form.data.name}
              disabled={readOnly}
              autoFocus={!webhook}
              autoComplete="off"
              placeholder="Frontend revalidation"
              onChange={(event) => form.setData('name', event.target.value)}
            />
          </FormField>
          <FormField
            label="URL"
            htmlFor="webhook-url"
            error={form.errors.url}
            help="Each delivery is a POST with an X-CMS-Signature header (HMAC-SHA256 of the raw body)."
          >
            <Input
              id="webhook-url"
              type="url"
              className="font-mono"
              value={form.data.url}
              disabled={readOnly}
              autoComplete="off"
              placeholder="https://hooks.example.com/cms"
              onChange={(event) => form.setData('url', event.target.value)}
            />
          </FormField>
          <label className="flex items-center justify-between gap-4 rounded-lg border p-3">
            <span className="grid gap-0.5">
              <span className="text-sm font-medium">Active</span>
              <span className="text-muted-foreground text-xs">
                Inactive webhooks are skipped: events aren’t queued or retried.
              </span>
            </span>
            <Switch
              checked={form.data.active}
              disabled={readOnly}
              onCheckedChange={(checked) => form.setData('active', checked)}
            />
          </label>
          <FormField label="Events" error={form.errors.events}>
            <EventPicker
              groups={groups}
              value={form.data.events}
              disabled={readOnly}
              onChange={(events) => form.setData('events', events)}
            />
          </FormField>
          {FiltersSlot &&
            createElement(FiltersSlot, {
              value: form.data.eventFilters,
              events: form.data.events,
              disabled: readOnly,
              error: form.errors.eventFilters,
              onChange: (value: { [event: string]: any }) => form.setData('eventFilters', value),
            })}
          <FormField
            label="Custom headers"
            htmlFor="webhook-headers"
            error={form.errors.headersText}
            help="Optional. One “Name: value” per line, e.g. Authorization: Bearer xyz."
          >
            <Textarea
              id="webhook-headers"
              rows={3}
              className="font-mono text-sm"
              spellCheck={false}
              value={form.data.headersText}
              disabled={readOnly}
              placeholder="Authorization: Bearer xyz"
              onChange={(event) => form.setData('headersText', event.target.value)}
            />
          </FormField>
          {canWrite && (
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.processing || (!!webhook && !form.isDirty)}>
                {form.processing ? 'Saving…' : webhook ? 'Save changes' : 'Add webhook'}
              </Button>
            </div>
          )}
        </form>
        {sheet.mode === 'edit' && (
          <>
            <Separator />
            <Deliveries webhook={sheet.webhook} deliveries={sheet.deliveries} />
          </>
        )}
      </div>
    </SheetContent>
  )
}

export default function WebhooksIndex({ webhooks, meta, eventGroups, sheet, filters }: Props) {
  const can = useCan()
  const canWrite = can('webhooks:write')
  const canDelete = can('webhooks:delete')
  const sheetKey = sheet ? (sheet.mode === 'edit' ? `edit-${sheet.webhook.id}` : 'new') : 'none'
  const [closedKey, setClosedKey] = useState<string | null>(null)
  const open = Boolean(sheet) && closedKey !== sheetKey

  function close() {
    setClosedKey(sheetKey)
    router.get(
      INDEX,
      {},
      { preserveScroll: true, preserveState: true, onFinish: () => setClosedKey(null) }
    )
  }

  function test(webhook: Webhook) {
    router.post(`${INDEX}/${webhook.id}/test`, {}, { preserveScroll: true })
  }

  const columns: Column<Webhook>[] = [
    {
      id: 'name',
      label: 'Name',
      primary: true,
      sort: 'name',
      cell: (webhook) => (
        <div className="min-w-0">
          <RowTitle href={`${INDEX}/${webhook.id}/edit`}>{webhook.name}</RowTitle>
          <RowActions>
            <RowAction href={`${INDEX}/${webhook.id}/edit`} keys="e">
              {canWrite ? 'Edit' : 'View'}
            </RowAction>
            {canWrite && <RowActionButton onClick={() => test(webhook)}>Send test</RowActionButton>}
            {canDelete && (
              <RowActionConfirm
                href={`${INDEX}/${webhook.id}`}
                title={`Delete “${webhook.name}”?`}
                description="Its receiver stops hearing about changes. Its delivery log goes too."
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
      id: 'url',
      label: 'URL',
      sort: 'url',
      cell: (webhook) => (
        <span
          className="text-muted-foreground block max-w-80 truncate font-mono text-xs"
          title={webhook.url}
        >
          {webhook.url}
        </span>
      ),
    },
    {
      id: 'events',
      label: 'Events',
      className: 'tabular-nums',
      cell: (webhook) => (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="cursor-default underline decoration-dotted underline-offset-4">
              {webhook.events.length}
            </span>
          </TooltipTrigger>
          <TooltipContent className="max-w-72 font-mono text-xs">
            {webhook.events.join(', ')}
          </TooltipContent>
        </Tooltip>
      ),
    },
    {
      id: 'health',
      label: 'Health',
      cell: (webhook) => <HealthBadge health={webhook.health} />,
    },
    {
      id: 'lastDelivery',
      label: 'Last delivery',
      sort: 'lastDelivery',
      defaultOrder: 'desc',
      className: 'text-muted-foreground text-sm whitespace-nowrap',
      cell: (webhook) => (webhook.lastDeliveryAt ? formatDateTime(webhook.lastDeliveryAt) : '—'),
    },
  ]

  return (
    <>
      <Head title="Webhooks" />
      <ListHeader
        title="Webhooks"
        search={filters.search}
        description="Notify other systems when content changes. Every delivery is signed and logged."
        actions={
          canWrite && (
            <Button asChild variant="outline" size="sm">
              <Link href={`${INDEX}/new`} data-keys="n" title="Add New Webhook (n)" preserveScroll>
                <Plus />
                Add New Webhook
              </Link>
            </Button>
          )
        }
      />
      <ListToolbar search={<ListSearch value={filters.search} placeholder="Search webhooks…" />} />
      {webhooks.length === 0 ? (
        <ListEmpty
          filtered={Boolean(filters.search)}
          resetHref={INDEX}
          icon={<WebhookIcon className="size-8" />}
          title="No webhooks yet"
          description="Add a webhook to tell a frontend, search index or chat channel when content is published or changed."
        />
      ) : (
        <ListTable
          rows={webhooks}
          rowKey={(webhook) => webhook.id}
          rowLabel={(webhook) => webhook.name}
          columns={columns}
          sort={filters}
        />
      )}
      <Pagination meta={meta} />
      <Sheet open={open} onOpenChange={(next) => !next && close()}>
        {sheet && (
          <WebhookSheet key={sheetKey} sheet={sheet} groups={eventGroups} onClose={close} />
        )}
      </Sheet>
    </>
  )
}
