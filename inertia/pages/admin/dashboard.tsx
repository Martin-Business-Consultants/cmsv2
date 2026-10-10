import type { ReactNode } from 'react'
import { Head, usePage } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { ArrowRight, FileText, Library, Plus } from 'lucide-react'
import type { Data } from '@generated/data'
import type { InertiaProps } from '~/types'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import PageHeader from '~/components/admin/page_header'
import StatusBadge from '~/components/admin/status_badge'
import Icon from '~/components/admin/dynamic_icon'
import { ActionBadge, AuditSubject } from '~/components/admin/audit_entry'
import { useCan } from '~/hooks/use_can'
import { formatDateTime } from '~/lib/format'
import { urlFor } from '~/client'
import { pluginWidgets } from '~/lib/plugin_components'

type Counts = { total: number; published: number; draft: number }

type Props = InertiaProps<{
  pages: {
    counts: Counts
    recent: { id: number; title: string; path: string; status: string; updatedAt: string | null }[]
  } | null
  entries: {
    counts: Counts
    recent: {
      id: number
      title: string
      collectionId: number
      collectionName: string
      status: string
      updatedAt: string | null
    }[]
  } | null
  widgets: { id: string; title: string; props: Record<string, any> }[]
  activity: Data.AuditLog[] | null
}>

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function Stat({
  label,
  value,
  detail,
  icon,
  href,
}: {
  label: string
  value: number
  detail?: string
  icon: ReactNode
  href?: string
}) {
  const body = (
    <Card className="hover:bg-muted/30 h-full gap-2 py-4 transition-colors">
      <CardHeader className="flex flex-row items-center justify-between px-4">
        <CardDescription>{label}</CardDescription>
        <span className="text-muted-foreground [&_svg]:size-4">{icon}</span>
      </CardHeader>
      <CardContent className="px-4">
        <div className="text-3xl font-semibold tabular-nums">{value}</div>
        {detail && <p className="text-muted-foreground mt-1 text-xs">{detail}</p>}
      </CardContent>
    </Card>
  )
  return href ? <Link href={href}>{body}</Link> : body
}

function RecentList({
  title,
  href,
  empty,
  children,
}: {
  title: string
  href: string
  empty: boolean
  children: ReactNode
}) {
  return (
    <Card className="gap-0 py-0">
      <CardHeader className="flex flex-row items-center justify-between border-b px-4 py-3 [.border-b]:pb-3">
        <CardTitle className="text-sm">{title}</CardTitle>
        <Link
          href={href}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
        >
          View all
          <ArrowRight className="size-3" />
        </Link>
      </CardHeader>
      <CardContent className="px-0">
        {empty ? (
          <p className="text-muted-foreground px-4 py-8 text-center text-sm">Nothing here yet.</p>
        ) : (
          <ul className="divide-y">{children}</ul>
        )}
      </CardContent>
    </Card>
  )
}

export default function Dashboard({ pages, entries, widgets, activity }: Props) {
  const can = useCan()
  const { user, admin } = usePage().props
  const firstName = user?.fullName?.split(' ')[0] ?? user?.displayName
  const collections = admin?.collections ?? []
  const firstCollection = collections[0]

  const actions: ReactNode[] = []
  if (can('pages:write')) {
    actions.push(
      <Button key="page" variant="outline" asChild>
        <Link route="admin.pages.create">
          <Plus />
          New page
        </Link>
      </Button>
    )
  }
  if (can('entries:write')) {
    for (const collection of collections) {
      actions.push(
        <Button key={`c${collection.id}`} variant="outline" asChild>
          <Link route="admin.entries.create" routeParams={{ collectionId: collection.id }}>
            <Icon name={collection.icon} />
            New in {collection.name}
          </Link>
        </Button>
      )
    }
  }

  return (
    <>
      <Head title="Dashboard" />
      <PageHeader
        title={`${greeting()}, ${firstName}`}
        description={`Here's what's happening on ${admin?.siteName ?? 'your site'}.`}
      />

      {actions.length > 0 && <div className="mb-6 flex flex-wrap gap-2">{actions}</div>}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {pages && (
          <Stat
            label="Pages"
            value={pages.counts.total}
            detail={`${pages.counts.published} published · ${pages.counts.draft} drafts`}
            icon={<FileText />}
            href={urlFor('admin.pages.index')}
          />
        )}
        {entries && (
          <Stat
            label="Entries"
            value={entries.counts.total}
            detail={`${entries.counts.published} published · ${entries.counts.draft} drafts`}
            icon={<Library />}
            href={
              firstCollection
                ? urlFor('admin.entries.index', { collectionId: firstCollection.id })
                : undefined
            }
          />
        )}
        {widgets.map((widget) => {
          const Widget = pluginWidgets[widget.id]
          return Widget ? <Widget key={widget.id} title={widget.title} {...widget.props} /> : null
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {pages && (
          <RecentList
            title="Recently edited pages"
            href={urlFor('admin.pages.index')}
            empty={!pages.recent.length}
          >
            {pages.recent.map((page) => (
              <li key={page.id}>
                <Link
                  route="admin.pages.edit"
                  routeParams={{ id: page.id }}
                  className="hover:bg-muted/50 flex items-center gap-3 px-4 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{page.title}</div>
                    <div className="text-muted-foreground truncate font-mono text-xs">
                      /{page.path}
                    </div>
                  </div>
                  <StatusBadge status={page.status} />
                  <span className="text-muted-foreground hidden w-36 text-right text-xs sm:block">
                    {formatDateTime(page.updatedAt)}
                  </span>
                </Link>
              </li>
            ))}
          </RecentList>
        )}
        {entries && (
          <RecentList
            title="Recently edited entries"
            href={
              firstCollection
                ? urlFor('admin.entries.index', { collectionId: firstCollection.id })
                : urlFor('admin.dashboard.show')
            }
            empty={!entries.recent.length}
          >
            {entries.recent.map((entry) => (
              <li key={entry.id}>
                <Link
                  route="admin.entries.edit"
                  routeParams={{ collectionId: entry.collectionId, id: entry.id }}
                  className="hover:bg-muted/50 flex items-center gap-3 px-4 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{entry.title}</div>
                    <div className="text-muted-foreground truncate text-xs">
                      {entry.collectionName}
                    </div>
                  </div>
                  <StatusBadge status={entry.status} />
                  <span className="text-muted-foreground hidden w-36 text-right text-xs sm:block">
                    {formatDateTime(entry.updatedAt)}
                  </span>
                </Link>
              </li>
            ))}
          </RecentList>
        )}
        {activity && (
          <div className="lg:col-span-2">
            <RecentList
              title="Recent activity"
              href={urlFor('admin.audit_logs.index')}
              empty={!activity.length}
            >
              {activity.map((log) => (
                <li
                  key={log.id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm"
                >
                  <span className="font-medium">{log.actorLabel}</span>
                  <ActionBadge action={log.action} />
                  <span className="min-w-0 flex-1">
                    <AuditSubject log={log} />
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {formatDateTime(log.createdAt)}
                  </span>
                </li>
              ))}
            </RecentList>
          </div>
        )}
      </div>
    </>
  )
}
