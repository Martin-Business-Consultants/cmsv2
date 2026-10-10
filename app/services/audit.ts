import { HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'
import type { LucidRow } from '@adonisjs/lucid/types/model'
import AuditLog from '#models/audit_log'
import { plugins } from '#services/plugins'

export type Via = 'admin' | 'api' | 'scheduler' | 'cli'

export type Origin = {
  via: Via
  userId: number | null
  actorType: 'User' | 'ServiceToken' | 'ApiClient' | null
  actorId: number | null
  actorLabel: string
  ip: string | null
  userAgent: string | null
}

export type OriginSource = HttpContext | Partial<Origin>

const ANNOUNCED =
  /^(page|entry)\.(created|published|unpublished|updated|deleted)$|^global\.updated$/

function labelFor(attributes: Record<string, unknown>) {
  for (const key of ['title', 'name', 'label', 'email', 'filename', 'source', 'slug']) {
    if (typeof attributes[key] === 'string' && attributes[key]) return attributes[key] as string
  }
  return `#${attributes.id}`
}

function attempt<T>(read: () => T | undefined) {
  try {
    return read() ?? null
  } catch {
    return null
  }
}

export function originOf(source?: OriginSource): Origin {
  if (!(source instanceof HttpContext)) {
    return {
      via: source?.via ?? 'cli',
      userId: source?.userId ?? null,
      actorType: source?.actorType ?? null,
      actorId: source?.actorId ?? null,
      actorLabel: source?.actorLabel ?? (source?.via === 'scheduler' ? 'Scheduler' : 'System'),
      ip: source?.ip ?? null,
      userAgent: source?.userAgent ?? null,
    }
  }
  const ctx = source
  const request = {
    ip: ctx.request.ip(),
    userAgent: ctx.request.header('user-agent')?.slice(0, 512) ?? null,
  }
  if (ctx.apiCaller) return { via: 'api', ...ctx.apiCaller.origin, ...request }
  const user = attempt(() => ctx.auth?.use('web').user)
  return {
    via: ctx.request.url().startsWith('/api/') ? 'api' : 'admin',
    userId: user ? Number(user.id) : null,
    actorType: user ? 'User' : null,
    actorId: user ? Number(user.id) : null,
    actorLabel: user?.displayName ?? 'System',
    ...request,
  }
}

export function isAnnouncedAction(action: string) {
  return ANNOUNCED.test(action)
}

export async function audit(
  source: OriginSource | undefined,
  action: string,
  subject?: LucidRow | null,
  metadata: Record<string, unknown> = {}
) {
  try {
    const origin = originOf(source)
    const log = await AuditLog.create({
      userId: origin.userId,
      actorType: origin.actorType,
      actorId: origin.actorId,
      actorLabel: origin.actorLabel.slice(0, 255),
      action,
      subjectType: subject ? subject.constructor.name : null,
      subjectId: subject ? Number(subject.$primaryKeyValue) : null,
      subjectLabel: subject ? labelFor(subject.$attributes).slice(0, 255) : null,
      metadata,
      ip: origin.ip,
      userAgent: origin.userAgent,
      via: origin.via,
    })
    if (isAnnouncedAction(action)) return
    await plugins.emit({
      action,
      subject: {
        type: log.subjectType,
        id: log.subjectId,
        label: log.subjectLabel,
        record: subject ?? undefined,
      },
      metadata: { ...metadata, via: origin.via },
      userId: log.userId,
    })
  } catch (error) {
    logger.error({ err: error, action }, 'Could not record audit event')
  }
}
