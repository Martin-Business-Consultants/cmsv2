import type { HttpContext } from '@adonisjs/core/http'
import { Exception } from '@adonisjs/core/exceptions'
import logger from '@adonisjs/core/services/logger'

export const RETRY_AFTER_SECONDS = 60

export type ApiErrorBody = { error: string; message?: string } & Record<string, unknown>

export class ApiProblem extends Exception {
  constructor(
    status: number,
    readonly body: ApiErrorBody,
    readonly headers: Record<string, string> = {}
  ) {
    super(body.message ?? body.error, { status, code: `E_API_${body.error.toUpperCase()}` })
  }
}

export function badRequest(message: string): never {
  throw new ApiProblem(400, { error: 'bad_request', message })
}

export function unauthorized(): never {
  throw new ApiProblem(401, { error: 'unauthorized' })
}

export function forbidden(capability: string): never {
  throw new ApiProblem(403, { error: 'forbidden', capability })
}

export function notFound(message = 'Not Found'): never {
  throw new ApiProblem(404, { error: 'not_found', message })
}

export function notAcceptable(): never {
  throw new ApiProblem(406, {
    error: 'not_acceptable',
    message: "This endpoint doesn't serve that format.",
  })
}

export function conflict(extra: Record<string, unknown> = {}): never {
  throw new ApiProblem(409, {
    error: 'conflict',
    message: 'It changed since you read it. Read it again and retry.',
    ...extra,
  })
}

export function gone(error: string, message?: string): never {
  throw new ApiProblem(410, message ? { error, message } : { error })
}

export function invalid(errors: Record<string, string[]>): never {
  throw new ApiProblem(422, { error: 'invalid', errors })
}

export function rateLimitedBody(): ApiErrorBody {
  return { error: 'rate_limited', message: 'Too many requests. Wait a minute and retry.' }
}

export function rateLimited(): never {
  throw new ApiProblem(429, rateLimitedBody(), { 'Retry-After': String(RETRY_AFTER_SECONDS) })
}

const STATUS_CODES: Record<number, string> = {
  400: 'bad_request',
  401: 'unauthorized',
  403: 'forbidden',
  404: 'not_found',
  405: 'method_not_allowed',
  406: 'not_acceptable',
  409: 'conflict',
  410: 'gone',
  413: 'payload_too_large',
  415: 'unsupported_media_type',
  422: 'invalid',
  429: 'rate_limited',
}

const STATUS_MESSAGES: Record<number, string> = {
  400: 'Bad Request',
  404: 'Not Found',
  405: 'Method Not Allowed',
  406: 'Not Acceptable',
  410: 'Gone',
  413: 'Payload Too Large',
  415: 'Unsupported Media Type',
}

function fieldErrors(messages: unknown): Record<string, string[]> {
  const errors: Record<string, string[]> = {}
  if (!Array.isArray(messages)) return errors
  for (const entry of messages as { field?: string; message?: string }[]) {
    const field = entry.field || 'base'
    ;(errors[field] ??= []).push(entry.message ?? 'is invalid')
  }
  return errors
}

export function apiErrorFor(error: unknown): {
  status: number
  body: ApiErrorBody
  headers: Record<string, string>
} {
  if (error instanceof ApiProblem) {
    return { status: error.status, body: error.body, headers: error.headers }
  }
  const raw = (error ?? {}) as {
    status?: number
    message?: string
    code?: string
    messages?: unknown
    capability?: string
  }
  const status = typeof raw.status === 'number' && raw.status >= 400 ? raw.status : 500
  if (raw.code === 'E_VALIDATION_ERROR' || (status === 422 && Array.isArray(raw.messages))) {
    return {
      status: 422,
      body: { error: 'invalid', errors: fieldErrors(raw.messages) },
      headers: {},
    }
  }
  if (raw.code === 'E_ROUTE_NOT_FOUND') {
    return { status: 404, body: { error: 'not_found', message: 'Not Found' }, headers: {} }
  }
  if (raw.code === 'E_ROW_NOT_FOUND') {
    return { status: 404, body: { error: 'not_found', message: 'Not Found' }, headers: {} }
  }
  if (raw.code === 'E_BAD_CSRF_TOKEN') {
    return {
      status: 403,
      body: {
        error: 'forbidden',
        message: 'Send a bearer token, or the X-XSRF-TOKEN header with a signed-in session.',
      },
      headers: {},
    }
  }
  if (status === 401) return { status, body: { error: 'unauthorized' }, headers: {} }
  if (status === 403) {
    return {
      status,
      body: { error: 'forbidden', capability: raw.capability ?? '(undeclared)' },
      headers: {},
    }
  }
  if (status === 429) {
    return {
      status,
      body: rateLimitedBody(),
      headers: { 'Retry-After': String(RETRY_AFTER_SECONDS) },
    }
  }
  if (status >= 500) {
    return {
      status: 500,
      body: { error: 'internal_error', message: 'Something went wrong on the CMS.' },
      headers: {},
    }
  }
  const code = STATUS_CODES[status] ?? 'bad_request'
  return {
    status,
    body: { error: code, message: raw.message || STATUS_MESSAGES[status] || 'Bad Request' },
    headers: {},
  }
}

export function renderApiError(error: unknown, ctx: HttpContext) {
  const { status, body, headers } = apiErrorFor(error)
  if (status >= 500) {
    logger.error({ err: error, path: ctx.request.url() }, 'API request failed')
  }
  for (const [name, value] of Object.entries(headers)) ctx.response.header(name, value)
  return ctx.response.status(status).json(body)
}
