import logger from '@adonisjs/core/services/logger'
import { getSettings } from '#services/settings'

const REFRESH_EVERY = 15_000

let headSources: string[] = []
let refreshedAt = 0
let refreshing: Promise<void> | null = null

export function originsIn(html: string | null | undefined) {
  const origins = new Set<string>()
  for (const match of (html ?? '').matchAll(/\b(?:src|href)\s*=\s*["']?([^"'\s>]+)/gi)) {
    try {
      const url = new URL(match[1].startsWith('//') ? `https:${match[1]}` : match[1])
      if (url.protocol === 'https:') origins.add(url.origin)
    } catch {
      continue
    }
  }
  return [...origins]
}

export async function refreshHeadScriptSources() {
  refreshing ??= getSettings()
    .then((settings) => {
      headSources = originsIn(settings.headScripts)
      refreshedAt = Date.now()
    })
    .catch((error) => {
      refreshedAt = Date.now()
      logger.debug({ err: error }, 'Could not read head scripts for the CSP')
    })
    .finally(() => {
      refreshing = null
    })
  return refreshing
}

export function headScriptSources() {
  if (Date.now() - refreshedAt > REFRESH_EVERY) void refreshHeadScriptSources()
  return headSources.join(' ')
}

function escapeAttribute(value: string) {
  return value.replace(/[&"<>]/g, (char) => `&#${char.charCodeAt(0)};`)
}

export function withNonce(html: string | null | undefined, nonce: string | null | undefined) {
  if (!html) return ''
  if (!nonce) return html
  return html.replace(
    /<script\b(?![^>]*\bnonce\s*=)/gi,
    `<script nonce="${escapeAttribute(nonce)}"`
  )
}
