import { Head, router } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { ClipboardList, Inbox, Plus, Search } from 'lucide-react'
import type { InertiaProps } from '~/types'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Badge } from '~/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '~/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table'
import PageHeader from '~/components/admin/page_header'
import StatusBadge from '~/components/admin/status_badge'
import EmptyState from '~/components/admin/empty_state'
import { useCan } from '~/hooks/use_can'
import { formatDateTime } from '~/lib/format'
import type { FormSummary } from '../../../app/types'

type Props = InertiaProps<{
  forms: FormSummary[]
  filters: { search: string; status: string }
}>

export default function FormsIndex({ forms, filters }: Props) {
  const can = useCan()
  const filtered = Boolean(filters.search || filters.status)
  const filter = (changes: Partial<Props['filters']>) =>
    router.get('/admin/forms', { ...filters, ...changes }, { preserveState: true, replace: true })
  const newButton = can('forms:write') && (
    <Button asChild>
      <Link href="/admin/forms/new">
        <Plus />
        New form
      </Link>
    </Button>
  )

  return (
    <>
      <Head title="Forms" />
      <PageHeader
        title="Forms"
        description="Contact and signup forms you can embed on any page."
        actions={
          <>
            {can('submissions:read') && (
              <Button asChild variant="outline">
                <Link href="/admin/submissions">
                  <Inbox />
                  Submissions
                </Link>
              </Button>
            )}
            {newButton}
          </>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Tabs
          value={filters.status || 'all'}
          onValueChange={(status) => filter({ status: status === 'all' ? '' : status })}
        >
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="published">Published</TabsTrigger>
            <TabsTrigger value="draft">Drafts</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative ml-auto w-full max-w-xs">
          <Search className="text-muted-foreground absolute top-2.5 left-2.5 size-4" />
          <Input
            className="pl-8"
            placeholder="Search forms…"
            defaultValue={filters.search}
            onChange={(event) => filter({ search: event.target.value })}
          />
        </div>
      </div>
      {forms.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="size-8" />}
          title={filtered ? 'No forms match' : 'No forms yet'}
          description={
            filtered
              ? 'Try another search or status.'
              : 'Build a form, publish it, then add it to a page with a Form block.'
          }
          action={filtered ? undefined : newButton}
        />
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Submissions</TableHead>
                <TableHead className="hidden text-right sm:table-cell">Last submission</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {forms.map((form) => (
                <TableRow key={form.id}>
                  <TableCell>
                    <Link
                      href={`/admin/forms/${form.id}/edit`}
                      className="font-medium hover:underline"
                    >
                      {form.title}
                    </Link>
                    <div className="text-muted-foreground font-mono text-xs">
                      /forms/{form.slug}
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={form.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    {can('submissions:read') ? (
                      <Link
                        href={`/admin/forms/${form.id}/submissions`}
                        className="inline-flex items-center gap-1.5 tabular-nums hover:underline"
                      >
                        {form.unreadCount > 0 && (
                          <Badge className="h-5 px-1.5 tabular-nums">{form.unreadCount} new</Badge>
                        )}
                        <Inbox className="text-muted-foreground size-4" />
                        {form.submissionsCount}
                      </Link>
                    ) : (
                      <span className="tabular-nums">{form.submissionsCount}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden text-right text-sm sm:table-cell">
                    {form.lastSubmissionAt ? formatDateTime(form.lastSubmissionAt) : 'Never'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  )
}
