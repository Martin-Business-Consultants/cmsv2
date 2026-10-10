import { Head, router } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { ArrowRight, Copy, Download, Inbox, Trash2 } from 'lucide-react'
import type { InertiaProps } from '~/types'
import { Button } from '~/components/ui/button'
import PageHeader from '~/components/admin/page_header'
import StatusBadge from '~/components/admin/status_badge'
import ConfirmAction from '~/components/admin/confirm_action'
import EmptyState from '~/components/admin/empty_state'
import { useCan } from '~/hooks/use_can'
import { formatDateTime } from '~/lib/format'
import { cn } from '~/lib/utils'
import FormEditor from '../../components/form_editor'
import type { FormDetail, SubmissionRow } from '../../../app/types'

type Props = InertiaProps<{
  form: FormDetail
  counts: { total: number; unread: number; spam: number }
  recent: SubmissionRow[]
  defaultRecipients: string | null
}>

function SubmissionsPanel({ form, counts, recent }: Pick<Props, 'form' | 'counts' | 'recent'>) {
  const can = useCan()
  if (!can('submissions:read')) {
    return <p className="text-muted-foreground text-sm">Your role can’t read submissions.</p>
  }
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-muted-foreground mr-auto text-sm">
          {counts.total} {counts.total === 1 ? 'submission' : 'submissions'} · {counts.unread}{' '}
          unread{counts.spam > 0 ? ` · ${counts.spam} spam` : ''}
        </p>
        {counts.total > 0 && (
          <Button asChild variant="outline" size="sm">
            <a href={`/admin/forms/${form.id}/submissions/export`} download>
              <Download />
              Export CSV
            </a>
          </Button>
        )}
        <Button asChild size="sm">
          <Link href={`/admin/forms/${form.id}/submissions`}>
            <Inbox />
            Open inbox
          </Link>
        </Button>
      </div>
      {recent.length === 0 ? (
        <EmptyState
          icon={<Inbox className="size-8" />}
          title="No submissions yet"
          description={
            form.status === 'published'
              ? 'Submissions appear here as soon as visitors send the form.'
              : 'This form is a draft. Publish it to start accepting submissions.'
          }
        />
      ) : (
        <ul className="divide-y rounded-xl border">
          {recent.map((submission) => (
            <li key={submission.id}>
              <Link
                href={`/admin/submissions/${submission.id}`}
                className="hover:bg-muted/50 flex items-center gap-3 px-4 py-2.5"
              >
                <span
                  className={cn(
                    'size-2 shrink-0 rounded-full',
                    submission.status === 'new' ? 'bg-primary' : 'bg-transparent'
                  )}
                />
                <span
                  className={cn(
                    'min-w-0 flex-1 truncate text-sm',
                    submission.status === 'new' && 'font-medium'
                  )}
                >
                  {submission.summary || `Submission #${submission.id}`}
                </span>
                <span className="text-muted-foreground shrink-0 text-xs">
                  {formatDateTime(submission.createdAt)}
                </span>
                <ArrowRight className="text-muted-foreground size-4" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function FormsEdit({ form, counts, recent, defaultRecipients }: Props) {
  const can = useCan()

  return (
    <>
      <Head title={form.title} />
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            {form.title}
            <StatusBadge status={form.status} />
          </span>
        }
        description={`/forms/${form.slug}`}
        back={{ href: '/admin/forms', label: 'Forms' }}
        actions={
          can('submissions:read') && (
            <Button asChild variant="ghost" size="sm">
              <Link href={`/admin/forms/${form.id}/submissions`}>
                <Inbox />
                {counts.total} {counts.total === 1 ? 'submission' : 'submissions'}
                {counts.unread > 0 && ` · ${counts.unread} new`}
              </Link>
            </Button>
          )
        }
      />
      <FormEditor
        key={form.updatedAt}
        initial={{
          title: form.title,
          slug: form.slug,
          status: form.status,
          fields: form.fields,
          submitLabel: form.submitLabel,
          successMessage: form.successMessage,
          submitUrl: form.submitUrl,
          webhookUrl: form.webhookUrl,
          emails: form.emails,
        }}
        action={`/admin/forms/${form.id}`}
        method="put"
        submitLabel="Save"
        defaultRecipients={defaultRecipients}
        unread={counts.unread}
        submissions={<SubmissionsPanel form={form} counts={counts} recent={recent} />}
        footer={
          (can('forms:write') || can('forms:delete')) && (
            <div className="flex items-center justify-between gap-2 border-t pt-3">
              {can('forms:write') && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => router.post(`/admin/forms/${form.id}/duplicate`)}
                >
                  <Copy />
                  Duplicate
                </Button>
              )}
              {can('forms:delete') && (
                <ConfirmAction
                  href={`/admin/forms/${form.id}`}
                  title="Move this form to the trash?"
                  description="It stops accepting submissions and disappears from pages that embed it. You can restore it from the trash with its submissions."
                  confirmLabel="Move to trash"
                  trigger={
                    <Button type="button" variant="ghost" size="sm" className="text-destructive">
                      <Trash2 />
                      Trash
                    </Button>
                  }
                />
              )}
            </div>
          )
        }
      />
    </>
  )
}
