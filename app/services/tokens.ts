import { createHash, randomBytes } from 'node:crypto'
import encryption from '@adonisjs/core/services/encryption'
import type Role from '#models/role'
import { plugins } from '#services/plugins'
import { WILDCARD } from '#types/permissions'

const PURPOSE = 'tokens.plaintext'

export const USE_THROTTLE_MS = 60_000

export function generatePlaintext(prefix: string) {
  return `${prefix}${randomBytes(32).toString('base64url')}`
}

export function digestToken(plaintext: string) {
  return createHash('sha256').update(plaintext).digest('hex')
}

export function candidateDigests(plaintext: string) {
  const digests = [digestToken(plaintext)]
  const legacy = /^lp_[A-Za-z0-9_-]+\.([A-Za-z0-9_-]+)$/.exec(plaintext)
  if (legacy) digests.push(digestToken(Buffer.from(legacy[1], 'base64url').toString('utf8')))
  return digests
}

export function encryptToken(plaintext: string) {
  return encryption.encrypt(plaintext, { purpose: PURPOSE })
}

export function decryptToken(cipher: string | null | undefined) {
  if (!cipher) return null
  try {
    const value = encryption.decrypt<string>(cipher, PURPOSE)
    return typeof value === 'string' && value ? value : null
  } catch {
    return null
  }
}

export function tokenColumns(plaintext: string, prefixLength: number) {
  return {
    token: encryptToken(plaintext),
    tokenDigest: digestToken(plaintext),
    prefix: plaintext.slice(0, prefixLength),
  }
}

export function maskToken(prefix: string) {
  return `${prefix}${'•'.repeat(8)}`
}

export function grantedCapabilities(role: Role | null | undefined): string[] {
  const known = plugins.permissionCatalog().flatMap((group) => group.capabilities)
  const permissions = role?.permissions ?? []
  if (permissions.includes(WILDCARD)) return known
  return known.filter((capability) => permissions.includes(capability))
}

export function groupedCapabilities(role: Role | null | undefined) {
  const granted = new Set(grantedCapabilities(role))
  return plugins
    .permissionCatalog()
    .map((group) => ({
      group: group.group,
      capabilities: group.capabilities.filter((capability) => granted.has(capability)),
    }))
    .filter((group) => group.capabilities.length)
}
