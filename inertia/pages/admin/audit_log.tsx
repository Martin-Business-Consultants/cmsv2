import { Fragment, useState } from 'react'
import { Head } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { ChevronDown, History } from 'lucide-react'
import type { Data } from '@generated/data'
import type { InertiaProps } from '~/types'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table'
import { ActionBadge, AuditSubject } from '~/components/admin/audit_entry'
import {
  ListEmpty,
  ListHeader,
  ListSearch,
  ListToolbar,
  Pagination,
  ScreenOptions,
  useListUrl,
  useScreenOptions,
  type ListMeta,
} from '~/components/admin/list'
import { formatDateTime } from '~/lib/format'
import { cn } from '~/lib/utils'
import { urlFor } from '~/client'

type Filters = {
  search: string
  action: string
  actor: string
  from: string
  to: string
  sort: string
  order: 'asc' | 'desc'
}

type Props = InertiaProps<{
  logs: Data.AuditLog[]
  links: Record<string, string>
  actors: { id: number; name: string }[]
  actions: string[]
  meta: ListMeta
  filters: Filters
}>

const GROUP_LABELS: Record<string, string> = {
  page: 'Pages',
  entry: 'Entries',
  collection: 'Collections',
  global: 'Globals',
  block_type: 'Block types',
  asset: 'Media',
  form: 'Forms',
  redirect: 'Redirects',
  user: 'Users',
  role: 'Roles',
  api_token: 'API tokens',
  service_token: 'Service tokens',
  device_authorization: 'Device logins',
  settings: 'Settings',
  trash: 'Trash',
  plugin: 'Plugins',
}

const COLUMNS = [
  { id: 'when', label: 'When', primary: true },
  { id: 'actor', label: 'Actor' },
  { id: 'action', label: 'Action' },
  { id: 'subject', label: 'Subject' },
  { id: 'ip', label: 'IP address', hidden: true },
]

function groupLabel(group: string) {
  return GROUP_LABELS[group] ?? group.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())
}

export default function AuditLogPage({ logs, links, actors, actions, meta, filters }: Props) {
  const [open, setOpen] = useState<number | null>(null)
  const { visit } = useListUrl()
  const screen = useScreenOptions('audit_log', COLUMNS)
  const show = screen.isVisible
  const filtered = Boolean(
    filters.search || filters.action || filters.actor || filters.from || filters.to
  )
  const groups = [...new Set(actions.map((action) => action.split('.')[0]))]
  const span = COLUMNS.filter((column) => show(column.id)).length + 1

  return (
    <>
      <Head title="Audit log" />
      <ListHeader
        title="Audit log"
        search={filters.search}
        description="Every change made in the admin, newest first."
        aside={<ScreenOptions screen={screen} />}
      />
      <ListToolbar
        search={<ListSearch value={filters.search} placeholder="Search the audit log…" />}
      >
        <Select
          value={filters.action || 'all'}
          onValueChange={(value) => visit({ action: value === 'all' ? '' : value })}
        >
          <SelectTrigger size="sm" className="w-52" aria-label="Action">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            {groups.map((group) => (
              <SelectGroup key={group}>
                <SelectLabel>{groupLabel(group)}</SelectLabel>
                <SelectItem value={`${group}.*`}>Any {groupLabel(group).toLowerCase()}</SelectItem>
                {actions
                  .filter((action) => action.startsWith(`${group}.`))
                  .map((action) => (
                    <SelectItem key={action} value={action} className="font-mono text-xs">
                      {action}
                    </SelectItem>
                  ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.actor || 'all'}
          onValueChange={(value) => visit({ actor: value === 'all' ? '' : value })}
        >
          <SelectTrigger size="sm" className="w-44" aria-label="Actor">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Everyone</SelectItem>
            {actors.map((actor) => (
              <SelectItem key={actor.id} value={String(actor.id)}>
                {actor.name}
              </SelectItem>
            ))}
            <SelectItem value="system">System</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1.5 text-sm">
          <label htmlFor="audit-from" className="text-muted-foreground">
            From
          </label>
          <Input
            id="audit-from"
            type="date"
            className="h-8 w-36"
            value={filters.from}
            max={filters.to || undefined}
            onChange={(event) => visit({ from: event.target.value })}
          />
          <label htmlFor="audit-to" className="text-muted-foreground">
            to
          </label>
          <Input
            id="audit-to"
            type="date"
            className="h-8 w-36"
            value={filters.to}
            min={filters.from || undefined}
            onChange={(event) => visit({ to: event.target.value })}
          />
        </div>
        {filtered && (
          <Button asChild variant="ghost" size="sm">
            <Link href={urlFor('admin.audit_logs.index')}>Clear filters</Link>
          </Button>
        )}
      </ListToolbar>
      {logs.length === 0 ? (
        <ListEmpty
          filtered={filtered}
          resetHref={urlFor('admin.audit_logs.index')}
          icon={<History className="size-8" />}
          title="Nothing logged yet"
          description="Changes made in the admin show up here."
        />
      ) : (
        <div className="bg-card rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-48 pl-4">When</TableHead>
                {show('actor') && <TableHead>Actor</TableHead>}
                {show('action') && <TableHead>Action</TableHead>}
                {show('subject') && <TableHead>Subject</TableHead>}
                {show('ip') && <TableHead>IP address</TableHead>}
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => {
                const metadata = (log.metadata ?? {}) as Record<string, unknown>
                const hasDetails = Object.keys(metadata).length > 0 || Boolean(log.ip)
                const expanded = open === log.id
                const toggle = () => hasDetails && setOpen(expanded ? null : log.id)
                return (
                  <Fragment key={log.id}>
                    <TableRow
                      data-list-item
                      className={cn(
                        'group/row data-[keyboard-current]:bg-muted/70 outline-none data-[keyboard-current]:shadow-[inset_3px_0_0_var(--color-primary)]',
                        hasDetails && 'cursor-pointer'
                      )}
                      onClick={toggle}
                    >
                      <TableCell className="text-muted-foreground pl-4 text-sm whitespace-nowrap">
                        <button
                          type="button"
                          data-list-open
                          aria-expanded={hasDetails ? expanded : undefined}
                          disabled={!hasDetails}
                          onClick={(event) => {
                            event.stopPropagation()
                            toggle()
                          }}
                          className="hover:text-foreground text-left disabled:cursor-default"
                        >
                          {formatDateTime(log.createdAt)}
                        </button>
                      </TableCell>
                      {show('actor') && (
                        <TableCell className="text-sm">
                          {log.userId ? (
                            <Link
                              route="admin.audit_logs.index"
                              qs={{ actor: log.userId }}
                              className="hover:underline"
                              onClick={(event) => event.stopPropagation()}
                            >
                              {log.actorLabel}
                            </Link>
                          ) : (
                            log.actorLabel
                          )}
                        </TableCell>
                      )}
                      {show('action') && (
                        <TableCell>
                          <Link
                            route="admin.audit_logs.index"
                            qs={{ action: log.action }}
                            onClick={(event) => event.stopPropagation()}
                          >
                            <ActionBadge action={log.action} />
                          </Link>
                        </TableCell>
                      )}
                      {show('subject') && (
                        <TableCell className="max-w-xs text-sm">
                          <span onClick={(event) => event.stopPropagation()}>
                            <AuditSubject log={log} href={links[log.id]} />
                          </span>
                        </TableCell>
                      )}
                      {show('ip') && (
                        <TableCell className="text-muted-foreground font-mono text-xs">
                          {log.ip ?? '—'}
                        </TableCell>
                      )}
                      <TableCell>
                        {hasDetails && (
                          <ChevronDown
                            className={cn(
                              'text-muted-foreground size-4 transition-transform',
                              expanded && 'rotate-180'
                            )}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                    {expanded && (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={span} className="bg-muted/40">
                          <pre className="overflow-x-auto font-mono text-xs leading-relaxed">
                            {JSON.stringify(metadata, null, 2)}
                          </pre>
                          {log.ip && (
                            <p className="text-muted-foreground mt-2 text-xs">IP {log.ip}</p>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
      <Pagination meta={meta} />
    </>
  )
}
