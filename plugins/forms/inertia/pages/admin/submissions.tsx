import { useEffect, useState } from 'react'
import { Head, router } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Inbox,
  MailOpen,
  Mail,
  Paperclip,
  Pencil,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import type { InertiaProps } from '~/types'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Badge } from '~/components/ui/badge'
import { Checkbox } from '~/components/ui/checkbox'
import { Tabs, TabsList, TabsTrigger } from '~/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '~/components/ui/sheet'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table'
import PageHeader from '~/components/admin/page_header'
import EmptyState from '~/components/admin/empty_state'
import ConfirmAction from '~/components/admin/confirm_action'
import { useCan } from '~/hooks/use_can'
import { formatBytes, formatDateTime } from '~/lib/format'
import { cn } from '~/lib/utils'
import type {
  FormDetail,
  FormOption,
  StoredFile,
  SubmissionRow,
  SubmissionValue,
} from '../../../app/types'

type Filters = { form: number | null; status: string; search: string }

type Props = InertiaProps<{
  form: FormDetail | null
  forms: FormOption[]
  submissions: SubmissionRow[]
  open: SubmissionRow | null
  counts: { inbox: number; unread: number; spam: number }
  filters: Filters
  meta: { total: number; perPage: number; currentPage: number; lastPage: number }
}>

const ALL = 'all'

function isFile(value: SubmissionValue): value is StoredFile {
  return Boolean(value && typeof value === 'object' && 'key' in value)
}

function display(value: SubmissionValue | undefined) {
  if (value === true) return 'Yes'
  if (value === false) return 'No'
  if (value === undefined || value === null || value === '') return '—'
  if (isFile(value)) return value.name
  return String(value)
}

function Answer({ submission, name }: { submission: SubmissionRow; name: string }) {
  const value = submission.data[name]
  if (isFile(value)) {
    return (
      <a
        href={`/admin/submissions/${submission.id}/files/${name}`}
        className="inline-flex items-center gap-1.5 text-sm underline-offset-2 hover:underline"
      >
        <Paperclip className="size-4" />
        {value.name}
        <span className="text-muted-foreground text-xs">{formatBytes(value.size)}</span>
      </a>
    )
  }
  return <dd className="text-sm break-words whitespace-pre-wrap">{display(value)}</dd>
}

function SubmissionSheet({
  submission,
  forms,
  fieldsFor,
  onClose,
}: {
  submission: SubmissionRow | null
  forms: FormOption[]
  fieldsFor: (submission: SubmissionRow) => { name: string; label: string }[]
  onClose: () => void
}) {
  const can = useCan()
  const fields = submission ? fieldsFor(submission) : []
  const known = new Set(fields.map((field) => field.name))
  const extra = submission ? Object.keys(submission.data).filter((key) => !known.has(key)) : []
  const formExists = submission ? forms.some((item) => item.id === submission.formId) : false
  const setStatus = (status: string) =>
    submission &&
    router.put(
      `/admin/submissions/${submission.id}`,
      { status },
      {
        preserveScroll: true,
        preserveState: true,
        onSuccess: status === 'read' ? undefined : onClose,
      }
    )

  return (
    <Sheet open={submission !== null} onOpenChange={(value) => !value && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {submission && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                Submission #{submission.id}
                {submission.status === 'spam' && <Badge variant="destructive">Spam</Badge>}
              </SheetTitle>
              <SheetDescription>
                {submission.formTitle} · {formatDateTime(submission.createdAt)}
              </SheetDescription>
            </SheetHeader>
            <dl className="grid gap-4 px-4">
              {fields.map((field) => (
                <div key={field.name} className="grid gap-1">
                  <dt className="text-muted-foreground text-xs font-medium">{field.label}</dt>
                  <Answer submission={submission} name={field.name} />
                </div>
              ))}
              {extra.map((key) => (
                <div key={key} className="grid gap-1">
                  <dt className="text-muted-foreground font-mono text-xs">{key}</dt>
                  <Answer submission={submission} name={key} />
                </div>
              ))}
              {fields.length === 0 && extra.length === 0 && (
                <p className="text-muted-foreground text-sm">
                  No answers were stored
                  {submission.meta.reason === 'honeypot'
                    ? ': a bot filled the hidden honeypot field.'
                    : '.'}
                </p>
              )}
              <div className="grid gap-3 border-t pt-4 text-sm">
                {submission.meta.pageUrl && (
                  <div className="grid gap-1">
                    <dt className="text-muted-foreground text-xs font-medium">Sent from</dt>
                    <dd>
                      <a
                        href={submission.meta.pageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 break-all hover:underline"
                      >
                        {submission.meta.pageUrl}
                        <ExternalLink className="size-3 shrink-0" />
                      </a>
                    </dd>
                  </div>
                )}
                {submission.meta.emails && (
                  <div className="grid gap-1">
                    <dt className="text-muted-foreground text-xs font-medium">Emails</dt>
                    <dd className="flex flex-wrap gap-1.5">
                      {Object.entries(submission.meta.emails).map(([kind, status]) => (
                        <Badge key={kind} variant={status === 'sent' ? 'secondary' : 'destructive'}>
                          {kind} {status}
                        </Badge>
                      ))}
                    </dd>
                  </div>
                )}
                {submission.meta.webhook && (
                  <div className="grid gap-1">
                    <dt className="text-muted-foreground text-xs font-medium">Webhook</dt>
                    <dd>
                      <Badge
                        variant={
                          submission.meta.webhook.status && submission.meta.webhook.status < 300
                            ? 'secondary'
                            : 'destructive'
                        }
                      >
                        {submission.meta.webhook.status ?? 'No response'}
                      </Badge>
                    </dd>
                  </div>
                )}
                <div className="grid gap-1">
                  <dt className="text-muted-foreground text-xs font-medium">IP address</dt>
                  <dd className="font-mono">{submission.ip ?? '—'}</dd>
                </div>
                <div className="grid gap-1">
                  <dt className="text-muted-foreground text-xs font-medium">User agent</dt>
                  <dd className="text-muted-foreground text-xs break-words">
                    {submission.meta.userAgent ?? '—'}
                  </dd>
                </div>
              </div>
            </dl>
            <SheetFooter className="flex-row flex-wrap gap-2">
              {submission.status !== 'spam' && (
                <Button variant="outline" size="sm" onClick={() => setStatus('new')}>
                  <Mail />
                  Mark unread
                </Button>
              )}
              {can('submissions:delete') &&
                (submission.status === 'spam' ? (
                  <Button variant="outline" size="sm" onClick={() => setStatus('read')}>
                    <ShieldCheck />
                    Not spam
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setStatus('spam')}>
                    <ShieldAlert />
                    Spam
                  </Button>
                ))}
              {formExists && can('forms:read') && (
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/admin/forms/${submission.formId}/edit`}>
                    <Pencil />
                    Form
                  </Link>
                </Button>
              )}
              {can('submissions:delete') && (
                <ConfirmAction
                  href={`/admin/submissions/${submission.id}`}
                  title="Delete this submission?"
                  description="It is removed permanently, with any files it carried."
                  confirmLabel="Delete submission"
                  trigger={
                    <Button variant="ghost" size="sm" className="text-destructive ml-auto">
                      <Trash2 />
                      Delete
                    </Button>
                  }
                />
              )}
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

export default function Submissions({
  form,
  forms,
  submissions,
  open: initialOpen,
  counts,
  filters,
  meta,
}: Props) {
  const can = useCan()
  const [openId, setOpenId] = useState<number | null>(initialOpen?.id ?? null)
  const [selected, setSelected] = useState<number[]>([])
  const [confirmDelete, setConfirmDelete] = useState(false)
  const open =
    submissions.find((submission) => submission.id === openId) ??
    (initialOpen?.id === openId ? initialOpen : null)
  const base = form ? `/admin/forms/${form.id}/submissions` : '/admin/submissions'
  const from = (meta.currentPage - 1) * meta.perPage + 1
  const to = from + submissions.length - 1
  const allSelected = submissions.length > 0 && selected.length === submissions.length

  useEffect(() => {
    setSelected((ids) => ids.filter((id) => submissions.some((submission) => submission.id === id)))
  }, [submissions])

  useEffect(() => {
    if (open?.status === 'new') {
      router.put(
        `/admin/submissions/${open.id}`,
        { status: 'read' },
        { preserveScroll: true, preserveState: true }
      )
    }
  }, [open?.id, open?.status])

  function visit(changes: Partial<Filters> & { page?: number }) {
    const next = { ...filters, ...changes }
    const target = next.form ? `/admin/forms/${next.form}/submissions` : '/admin/submissions'
    router.get(
      target,
      { status: next.status || undefined, search: next.search || undefined, page: changes.page },
      { preserveState: true, replace: true, preserveScroll: changes.page !== undefined }
    )
  }

  function bulk(action: 'delete' | 'read' | 'new' | 'spam') {
    router.post(
      '/admin/submissions/bulk',
      { ids: selected, action },
      {
        preserveScroll: true,
        onSuccess: () => {
          setSelected([])
          setConfirmDelete(false)
        },
      }
    )
  }

  function fieldsFor(submission: SubmissionRow) {
    return Object.keys(submission.data).length ? submission.fields : []
  }

  const emptyText =
    filters.status === 'spam'
      ? 'No spam. Submissions caught by the honeypot or marked as spam show up here.'
      : filters.search
        ? 'Nothing matches that search.'
        : form && form.status !== 'published'
          ? 'This form is a draft. Publish it to start accepting submissions.'
          : 'Submissions appear here as soon as visitors send a form.'

  return (
    <>
      <Head title={form ? `Submissions · ${form.title}` : 'Submissions'} />
      <PageHeader
        title="Submissions"
        description={form ? form.title : 'Everything sent through your forms, newest first.'}
        back={form ? { href: `/admin/forms/${form.id}/edit`, label: form.title } : undefined}
        actions={
          <>
            {form && can('forms:read') && (
              <Button asChild variant="ghost" size="sm">
                <Link href={`/admin/forms/${form.id}/edit`}>
                  <Pencil />
                  Edit form
                </Link>
              </Button>
            )}
            {form && meta.total > 0 && (
              <Button asChild variant="outline" size="sm">
                <a
                  href={`/admin/forms/${form.id}/submissions/export${filters.status === 'spam' ? '?status=spam' : ''}`}
                  download
                >
                  <Download />
                  Export CSV
                </a>
              </Button>
            )}
          </>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Tabs
          value={filters.status || 'inbox'}
          onValueChange={(status) => visit({ status: status === 'inbox' ? '' : status })}
        >
          <TabsList>
            <TabsTrigger value="inbox">
              Inbox <span className="text-muted-foreground tabular-nums">{counts.inbox}</span>
            </TabsTrigger>
            <TabsTrigger value="new">
              Unread <span className="text-muted-foreground tabular-nums">{counts.unread}</span>
            </TabsTrigger>
            <TabsTrigger value="spam">
              Spam <span className="text-muted-foreground tabular-nums">{counts.spam}</span>
            </TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>
        <Select
          value={filters.form ? String(filters.form) : ALL}
          onValueChange={(value) => visit({ form: value === ALL ? null : Number(value) })}
        >
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All forms</SelectItem>
            {forms.map((item) => (
              <SelectItem key={item.id} value={String(item.id)}>
                {item.title}
              </SelectItem>
            ))}
            {form && !forms.some((item) => item.id === form.id) && (
              <SelectItem value={String(form.id)}>{form.title}</SelectItem>
            )}
          </SelectContent>
        </Select>
        <div className="relative w-full sm:ml-auto sm:max-w-xs">
          <Search className="text-muted-foreground absolute top-2.5 left-2.5 size-4" />
          <Input
            className="pl-8"
            placeholder="Search answers…"
            defaultValue={filters.search}
            onChange={(event) => visit({ search: event.target.value })}
          />
        </div>
      </div>

      {selected.length > 0 && (
        <div className="bg-muted/50 mb-3 flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2">
          <span className="mr-auto text-sm font-medium">{selected.length} selected</span>
          <Button variant="outline" size="sm" onClick={() => bulk('read')}>
            <MailOpen />
            Mark read
          </Button>
          <Button variant="outline" size="sm" onClick={() => bulk('new')}>
            <Mail />
            Mark unread
          </Button>
          {can('submissions:delete') && (
            <>
              {filters.status === 'spam' ? (
                <Button variant="outline" size="sm" onClick={() => bulk('read')}>
                  <ShieldCheck />
                  Not spam
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={() => bulk('spam')}>
                  <ShieldAlert />
                  Spam
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="text-destructive"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 />
                Delete
              </Button>
            </>
          )}
        </div>
      )}

      {submissions.length === 0 ? (
        <EmptyState
          icon={<Inbox className="size-8" />}
          title={filters.status === 'spam' ? 'No spam' : 'No submissions'}
          description={emptyText}
        />
      ) : (
        <>
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      aria-label="Select all"
                      checked={allSelected ? true : selected.length ? 'indeterminate' : false}
                      onCheckedChange={(checked) =>
                        setSelected(checked === true ? submissions.map((item) => item.id) : [])
                      }
                    />
                  </TableHead>
                  <TableHead>Submission</TableHead>
                  {!form && <TableHead className="hidden md:table-cell">Form</TableHead>}
                  <TableHead className="text-right whitespace-nowrap">Received</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((submission) => {
                  const unread = submission.status === 'new'
                  return (
                    <TableRow
                      key={submission.id}
                      data-state={selected.includes(submission.id) ? 'selected' : undefined}
                      className="cursor-pointer"
                      tabIndex={0}
                      onClick={() => setOpenId(submission.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') setOpenId(submission.id)
                      }}
                    >
                      <TableCell onClick={(event) => event.stopPropagation()}>
                        <Checkbox
                          aria-label={`Select submission ${submission.id}`}
                          checked={selected.includes(submission.id)}
                          onCheckedChange={(checked) =>
                            setSelected((ids) =>
                              checked === true
                                ? [...ids, submission.id]
                                : ids.filter((id) => id !== submission.id)
                            )
                          }
                        />
                      </TableCell>
                      <TableCell className="max-w-0 w-full">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              'size-2 shrink-0 rounded-full',
                              unread ? 'bg-primary' : 'bg-transparent'
                            )}
                          />
                          <span className={cn('truncate', unread && 'font-semibold')}>
                            {submission.summary || `Submission #${submission.id}`}
                          </span>
                          {submission.status === 'spam' && (
                            <Badge variant="outline" className="shrink-0">
                              Spam
                            </Badge>
                          )}
                        </div>
                        {!form && (
                          <div className="text-muted-foreground truncate pl-4 text-xs md:hidden">
                            {submission.formTitle}
                          </div>
                        )}
                      </TableCell>
                      {!form && (
                        <TableCell className="text-muted-foreground hidden whitespace-nowrap md:table-cell">
                          {submission.formTitle}
                        </TableCell>
                      )}
                      <TableCell className="text-muted-foreground text-right text-sm whitespace-nowrap">
                        {formatDateTime(submission.createdAt)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
          <div className="text-muted-foreground mt-4 flex items-center justify-between gap-4 text-sm">
            <span>
              {from}–{to} of {meta.total}
            </span>
            {meta.lastPage > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={meta.currentPage <= 1}
                  onClick={() => visit({ page: meta.currentPage - 1 })}
                >
                  <ChevronLeft />
                  Previous
                </Button>
                <span className="tabular-nums">
                  Page {meta.currentPage} of {meta.lastPage}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={meta.currentPage >= meta.lastPage}
                  onClick={() => visit({ page: meta.currentPage + 1 })}
                >
                  Next
                  <ChevronRight />
                </Button>
              </div>
            )}
          </div>
        </>
      )}

      <SubmissionSheet
        submission={open}
        forms={forms}
        fieldsFor={fieldsFor}
        onClose={() => {
          setOpenId(null)
          if (initialOpen && window.location.pathname !== base) {
            window.history.replaceState(window.history.state, '', base)
          }
        }}
      />

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selected.length} {selected.length === 1 ? 'submission' : 'submissions'}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              They are removed permanently, with any files they carried.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={(event) => {
                event.preventDefault()
                bulk('delete')
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
