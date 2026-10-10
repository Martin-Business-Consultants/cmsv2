import { router } from '@inertiajs/react'
import { Monitor, Smartphone } from 'lucide-react'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import TimeAgo from '~/components/account/time_ago'
import { urlFor } from '~/client'

export type AccountSession = {
  id: number
  device: string
  userAgent: string | null
  ipAddress: string | null
  createdAt: string
  lastSeenAt: string
  current: boolean
}

export default function SessionsSection({ sessions }: { sessions: AccountSession[] }) {
  return (
    <ul className="divide-y">
      {sessions.map((session) => {
        const Icon = /iPhone|iPad|Android/.test(session.device) ? Smartphone : Monitor
        return (
          <li key={session.id} className="flex items-center justify-between gap-4 py-3">
            <div className="flex min-w-0 items-start gap-3">
              <Icon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
              <div className="grid min-w-0 gap-0.5 text-sm">
                <span className="truncate font-medium" title={session.userAgent ?? undefined}>
                  {session.device}
                </span>
                <span className="text-muted-foreground">
                  {session.ipAddress || 'Unknown address'} · signed in{' '}
                  <TimeAgo value={session.createdAt} /> · active{' '}
                  <TimeAgo value={session.lastSeenAt} />
                </span>
              </div>
            </div>
            {session.current ? (
              <Badge variant="secondary">This device</Badge>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  router.delete(urlFor('admin.account_sessions.destroy', { id: session.id }), {
                    preserveScroll: true,
                    preserveState: true,
                  })
                }
              >
                Sign out
              </Button>
            )}
          </li>
        )
      })}
    </ul>
  )
}
