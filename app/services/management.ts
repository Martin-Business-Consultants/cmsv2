import type { HttpContext } from '@adonisjs/core/http'
import string from '@adonisjs/core/helpers/string'
import logger from '@adonisjs/core/services/logger'
import type { DateTime } from 'luxon'
import ApiToken from '#models/api_token'
import ServiceToken from '#models/service_token'
import type User from '#models/user'
import type Role from '#models/role'
import { plugins } from '#services/plugins'
import { grantedCapabilities } from '#services/tokens'
import { WILDCARD } from '#types/permissions'
import { forbidden } from '#services/api_errors'

export const PUBLIC = 'public' as const

export type Authorization = Record<string, string>

export type Crumb = { description: string; command: string }

export type AgentSummaries = Record<string, (payload: any, ctx: HttpContext) => unknown>

export type AgentBreadcrumbs = Record<string, (payload: any, ctx: HttpContext) => Crumb[] | Crumb>

export type ManagementControllerClass = {
  capabilities?: Authorization
  agentSummary?: AgentSummaries
  agentBreadcrumbs?: AgentBreadcrumbs
}

export function crumb(description: string, command: string): Crumb {
  return { description, command }
}

export class ApiCaller {
  constructor(
    readonly user: User | null,
    readonly token: ApiToken | ServiceToken | null
  ) {}

  get service() {
    return this.token instanceof ServiceToken ? this.token : null
  }

  get personal() {
    return this.token instanceof ApiToken ? this.token : null
  }

  get role(): Role | null {
    return this.service ? this.service.role : (this.user?.role ?? null)
  }

  can(capability: string) {
    if (this.token) return this.token.can(capability)
    return this.user?.can(capability) ?? false
  }

  get capabilities() {
    return grantedCapabilities(this.role)
  }

  get label() {
    return this.service ? this.service.name : (this.user?.displayName ?? 'System')
  }

  get origin() {
    if (this.service) {
      return {
        userId: null,
        actorType: 'ServiceToken' as const,
        actorId: Number(this.service.id),
        actorLabel: this.service.name,
      }
    }
    return {
      userId: this.user ? Number(this.user.id) : null,
      actorType: this.user ? ('User' as const) : null,
      actorId: this.user ? Number(this.user.id) : null,
      actorLabel: this.user?.displayName ?? 'System',
    }
  }
}

declare module '@adonisjs/core/http' {
  export interface HttpContext {
    apiCaller?: ApiCaller
  }
}

export function bearerOf(ctx: HttpContext) {
  const header = ctx.request.header('authorization') ?? ''
  if (!header.startsWith('Bearer ')) return null
  return header.slice('Bearer '.length).trim()
}

export async function authenticateApi(ctx: HttpContext) {
  const plaintext = bearerOf(ctx)
  if (plaintext !== null) {
    const personal = await ApiToken.authenticate(plaintext)
    const token = personal ?? (await ServiceToken.authenticate(plaintext))
    if (!token) return null
    await token.recordUse(ctx.request.ip())
    ctx.apiCaller = new ApiCaller(personal ? personal.user : null, token)
    return ctx.apiCaller
  }
  const user = ctx.auth.use('web').user
  if (!user) return null
  if (!user.role && user.roleId) await user.load('role')
  ctx.apiCaller = new ApiCaller(user, null)
  return ctx.apiCaller
}

export function callerOf(ctx: HttpContext) {
  if (!ctx.apiCaller) throw new Error('No API caller on this request')
  return ctx.apiCaller
}

export function granted(ctx: HttpContext, capability: string) {
  return ctx.apiCaller?.can(capability) ?? false
}

export function requireCapability(ctx: HttpContext, capability: string) {
  if (!granted(ctx, capability)) forbidden(capability)
}

export function publishedOnly(ctx: HttpContext, prefix: string) {
  return !granted(ctx, `${prefix}:write`)
}

export async function controllerOf(ctx: HttpContext) {
  const handler = ctx.route?.handler
  if (!handler || typeof handler === 'function' || typeof handler.reference === 'string') {
    return null
  }
  const [reference] = handler.reference
  const lazy = typeof reference === 'function' && !('prototype' in reference && reference.prototype)
  const loaded = lazy ? await (reference as () => Promise<{ default: unknown }>)() : null
  const resolved = loaded ? loaded.default : reference
  return { controller: resolved as ManagementControllerClass, action: handler.method }
}

export function capabilityFor(controller: ManagementControllerClass, action: string) {
  const map = controller.capabilities ?? {}
  const declared = map[action] ?? map['*']
  if (declared === undefined) return null
  if (
    declared !== PUBLIC &&
    declared !== WILDCARD &&
    !plugins.allCapabilities().includes(declared)
  ) {
    throw new Error(`unknown capability: ${declared}`)
  }
  return declared
}

const FALSE_VALUES = new Set(['0', 'f', 'F', 'false', 'FALSE', 'off', 'OFF'])

export function wantsEnvelope(ctx: HttpContext) {
  if (ctx.request.header('x-agent-envelope') === '1') return true
  const value = ctx.request.qs().envelope
  if (value === undefined || value === null) return false
  const text = String(Array.isArray(value) ? value[value.length - 1] : value)
  return text !== '' && !FALSE_VALUES.has(text)
}

function humanize(key: string, capitalize = true) {
  const words = key.replace(/_id$/, '').replace(/[_-]+/g, ' ').trim().toLowerCase()
  return capitalize ? words.charAt(0).toUpperCase() + words.slice(1) : words
}

function errorSummary(payload: Record<string, unknown>) {
  return [payload.error, payload.message, payload.capability]
    .filter((part) => part !== undefined && part !== null)
    .join(' — ')
}

function listSummary(payload: Record<string, unknown>, name: string, list: unknown[]) {
  const total = Number(payload.total ?? list.length)
  const paged = payload.page && payload.per && total > Number(payload.per)
  const singular = string.singular(humanize(name, false))
  const noun = total === 1 ? singular : string.plural(singular)
  return `${total} ${noun}${paged ? ` (page ${payload.page})` : ''}.`
}

export function defaultSummary(payload: unknown) {
  if (Array.isArray(payload)) return `${payload.length} result(s).`
  if (!payload || typeof payload !== 'object') return 'Done.'
  const record = payload as Record<string, unknown>
  if (record.error) return errorSummary(record)
  const list = Object.entries(record).find(([, value]) => Array.isArray(value))
  if (list) return listSummary(record, list[0], list[1] as unknown[])
  const key = Object.keys(record)[0]
  return key ? `${humanize(key)}.` : 'Done.'
}

function present(value: unknown) {
  if (value === null || value === undefined || value === false) return false
  if (typeof value === 'string') return value.trim() !== ''
  return true
}

export function envelopeFor(
  ctx: HttpContext,
  payload: unknown,
  controller: ManagementControllerClass | null,
  action: string | null
) {
  const ok = ctx.response.getStatus() < 400
  let summary: unknown
  try {
    const declared = action ? controller?.agentSummary?.[action] : undefined
    const value = declared ? declared(payload, ctx) : undefined
    summary = present(value) ? value : defaultSummary(payload)
  } catch (error) {
    logger.warn({ err: error, action }, 'agent envelope summary raised')
    try {
      summary = defaultSummary(payload)
    } catch {
      summary = 'Done.'
    }
  }
  let breadcrumbs: Crumb[] = []
  if (ok) {
    try {
      const declared = action ? controller?.agentBreadcrumbs?.[action] : undefined
      const value = declared ? declared(payload, ctx) : []
      breadcrumbs = Array.isArray(value) ? value : value ? [value] : []
    } catch (error) {
      logger.warn({ err: error, action }, 'agent envelope breadcrumbs raised')
      breadcrumbs = []
    }
  }
  return { status: ok ? 'ok' : 'error', summary, data: payload, breadcrumbs }
}

export function wrapInEnvelope(
  ctx: HttpContext,
  controller: ManagementControllerClass | null,
  action: string | null
) {
  if (!wantsEnvelope(ctx)) return
  const lazy = ctx.response.getBody()
  if (lazy === undefined || lazy === null || typeof lazy !== 'object') return
  if (Buffer.isBuffer(lazy) || typeof (lazy as { pipe?: unknown }).pipe === 'function') return
  ctx.response.json(envelopeFor(ctx, lazy, controller, action))
}

export type ListParams = { page: number; per: number; offset: number }

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function integer(value: unknown) {
  const match = /^\s*[+-]?\d+/.exec(String(value ?? ''))
  return match ? Number.parseInt(match[0], 10) : 0
}

export function listParams(
  ctx: HttpContext,
  options: { per?: number; maxPer?: number; maxPage?: number } = {}
): ListParams {
  const qs = ctx.request.qs()
  const page = clamp(qs.page === undefined ? 1 : integer(qs.page), 1, options.maxPage ?? 10_000)
  const per = clamp(
    qs.per === undefined ? (options.per ?? 25) : integer(qs.per),
    1,
    options.maxPer ?? 100
  )
  return { page, per, offset: (page - 1) * per }
}

export function listBody<T>(key: string, items: T[], params: ListParams, total: number) {
  return { [key]: items, page: params.page, per: params.per, total }
}

export function iso(value: DateTime | null | undefined) {
  return value ? value.toUTC().toFormat("yyyy-MM-dd'T'HH:mm:ss'Z'") : null
}
