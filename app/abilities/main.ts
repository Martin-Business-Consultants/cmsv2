import { Bouncer } from '@adonisjs/bouncer'
import type User from '#models/user'

export const access = Bouncer.ability((user: User, capability: string) => {
  return user.can(capability)
})
