import { createHash } from 'node:crypto'
import encryption from '@adonisjs/core/services/encryption'
import User from '#models/user'

type Purpose = 'password_reset' | 'email_verification'

const LIFETIMES: Record<Purpose, string> = {
  password_reset: '20 minutes',
  email_verification: '2 days',
}

function fingerprint(user: User, purpose: Purpose) {
  const source = purpose === 'password_reset' ? user.password.slice(-10) : user.email
  return createHash('sha256').update(`${purpose}:${source}`).digest('hex').slice(0, 32)
}

export function tokenFor(user: User, purpose: Purpose) {
  return encryption.encrypt(
    { id: user.id, fp: fingerprint(user, purpose) },
    LIFETIMES[purpose],
    purpose
  )
}

export async function userForToken(token: string | undefined, purpose: Purpose) {
  if (!token) return null
  const payload = encryption.decrypt<{ id: number; fp: string }>(token, purpose)
  if (!payload || typeof payload.id !== 'number') return null
  const user = await User.find(payload.id)
  if (!user || fingerprint(user, purpose) !== payload.fp) return null
  return user
}
