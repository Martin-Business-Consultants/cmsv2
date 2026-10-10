import { Link } from '@adonisjs/inertia/react'
import { ArrowRight, Inbox } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader } from '~/components/ui/card'
import { formatDateTime } from '~/lib/format'

type Latest = {
  id: number
  formTitle: string
  summary: string
  status: string
  createdAt: string | null
}

export default function SubmissionsWidget({
  title,
  count,
  unread,
  latest,
}: {
  title: string
  count: number
  unread: number
  latest: Latest[]
}) {
  return (
    <Card className="h-full gap-2 py-4">
      <CardHeader className="flex flex-row items-center justify-between px-4">
        <CardDescription>{title} · last 7 days</CardDescription>
        <Inbox className="text-muted-foreground size-4" />
      </CardHeader>
      <CardContent className="grid gap-3 px-4">
        <div>
          <div className="text-3xl font-semibold tabular-nums">{count}</div>
          <p className="text-muted-foreground mt-1 text-xs">
            {unread === 0 ? 'Inbox zero' : `${unread} unread`}
          </p>
        </div>
        {latest.length > 0 && (
          <ul className="-mx-4 grid border-t">
            {latest.slice(0, 3).map((item) => (
              <li key={item.id}>
                <Link
                  href={`/admin/submissions/${item.id}`}
                  className="hover:bg-muted/50 flex items-center gap-2 px-4 py-1.5"
                >
                  {item.status === 'new' && (
                    <span className="bg-primary size-1.5 shrink-0 rounded-full" />
                  )}
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {item.summary || item.formTitle}
                  </span>
                  <span className="text-muted-foreground shrink-0 text-xs">
                    {item.createdAt ? formatDateTime(item.createdAt) : ''}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Link
          href="/admin/submissions"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
        >
          Open the inbox
          <ArrowRight className="size-3" />
        </Link>
      </CardContent>
    </Card>
  )
}
