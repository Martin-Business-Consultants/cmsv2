import { Link } from '@adonisjs/inertia/react'
import type { Data } from '@generated/data'
import { Badge } from '~/components/ui/badge'

const SUBJECT_LABELS: Record<string, string> = {
  ApiClient: 'API client',
  ApiToken: 'API token',
  ServiceToken: 'Service token',
  DeviceAuthorization: 'Device login',
  BlockType: 'Block type',
  Asset: 'Media',
  FormSubmission: 'Submission',
}

export function subjectTypeLabel(type: string | null) {
  if (!type) return null
  return SUBJECT_LABELS[type] ?? type
}

export function actionLabel(action: string) {
  const [, verb = action] = action.split('.')
  return verb.replace(/_/g, ' ')
}

export function ActionBadge({ action }: { action: string }) {
  const verb = action.split('.')[1] ?? ''
  const variant =
    verb.includes('deleted') || verb.includes('trashed') || verb.includes('revoked')
      ? 'destructive'
      : verb.includes('created') || verb.includes('published') || verb.includes('restored')
        ? 'default'
        : 'secondary'
  return (
    <Badge variant={variant} className="font-mono text-[11px]">
      {action}
    </Badge>
  )
}

export function AuditSubject({ log, href }: { log: Data.AuditLog; href?: string }) {
  if (!log.subjectType && !log.subjectLabel) return <span className="text-muted-foreground">—</span>
  return (
    <span className="inline-flex min-w-0 items-baseline gap-1.5">
      {href ? (
        <Link href={href} className="truncate font-medium hover:underline">
          {log.subjectLabel}
        </Link>
      ) : (
        <span className="truncate font-medium">{log.subjectLabel}</span>
      )}
      {log.subjectType && (
        <span className="text-muted-foreground shrink-0 text-xs">
          {subjectTypeLabel(log.subjectType)}
        </span>
      )}
    </span>
  )
}
