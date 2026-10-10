import type { HttpContext } from '@adonisjs/core/http'

const REFRESH_AFTER = 30_000

let configured: string[] | null = null
let loadedAt = 0
let refreshing = false

export function setPublicOrigins(origins: string[]) {
  configured = [...new Set(origins)]
  loadedAt = Date.now()
}

function refresh() {
  if (refreshing) return
  refreshing = true
  import('#services/settings')
    .then(({ getSettings }) => getSettings())
    .catch(() => {})
    .finally(() => {
      refreshing = false
    })
}

export function publicOrigins() {
  if (!configured || Date.now() - loadedAt > REFRESH_AFTER) refresh()
  return configured
}

function ownOrigin(ctx: HttpContext) {
  const host = ctx.request.host()
  return host ? `${ctx.request.protocol()}://${host}` : null
}

export function corsOrigin(origin: string, ctx: HttpContext) {
  const path = ctx.request.url()
  if (path === '/admin' || path.startsWith('/admin/')) return origin === ownOrigin(ctx)
  const allowed = publicOrigins()
  if (!allowed || !allowed.length) return true
  return allowed.includes(origin) || origin === ownOrigin(ctx)
}
