import type { HttpContext } from '@adonisjs/core/http'
import type User from '#models/user'

export type Actor = {
  user: User | null
  can(capability: string): boolean
}

export function actorOf(ctx: HttpContext): Actor {
  const caller = ctx.apiCaller
  if (caller) return { user: caller.user, can: (capability) => caller.can(capability) }
  const user = ctx.auth.use('web').user ?? null
  return { user, can: (capability) => user?.can(capability) ?? false }
}
