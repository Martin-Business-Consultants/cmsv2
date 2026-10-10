import { BlockList, isIP } from 'node:net'
import { lookup } from 'node:dns/promises'
import http from 'node:http'
import https from 'node:https'
import app from '@adonisjs/core/services/app'
import env from '#start/env'

export class OutboundUrlError extends Error {
  code = 'E_OUTBOUND_URL'
}

export type SafeFetchOptions = {
  timeout?: number
  connectTimeout?: number
  maxBytes?: number
  allowPrivate?: boolean
}

type ResolvedTarget = { url: URL; address: string; family: 4 | 6 }

const blocked = new BlockList()
for (const [network, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.88.99.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
] as const) {
  blocked.addSubnet(network, prefix, 'ipv4')
}
for (const [network, prefix] of [
  ['::', 128],
  ['::1', 128],
  ['64:ff9b::', 96],
  ['64:ff9b:1::', 48],
  ['100::', 64],
  ['2001::', 32],
  ['2001:db8::', 32],
  ['2002::', 16],
  ['fc00::', 7],
  ['fe80::', 10],
  ['fec0::', 10],
  ['ff00::', 8],
] as const) {
  blocked.addSubnet(network, prefix, 'ipv6')
}

function mappedIpv4(address: string) {
  const match = address.toLowerCase().match(/^::(ffff:(0:)?)?(\d+\.\d+\.\d+\.\d+)$/)
  if (match) return match[3]
  const hex = address.toLowerCase().match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/)
  if (!hex) return null
  const high = Number.parseInt(hex[1], 16)
  const low = Number.parseInt(hex[2], 16)
  return [high >> 8, high & 255, low >> 8, low & 255].join('.')
}

export function isPrivateAddress(address: string) {
  const family = isIP(address)
  if (family === 4) return blocked.check(address, 'ipv4')
  if (family === 6) {
    const ipv4 = mappedIpv4(address)
    if (ipv4) return blocked.check(ipv4, 'ipv4')
    return blocked.check(address, 'ipv6')
  }
  return true
}

export function privateAddressesAllowed() {
  return env.get('CMS_ALLOW_PRIVATE_WEBHOOKS') ?? app.inDev
}

export function parseOutboundUrl(value: string) {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new OutboundUrlError('URL is not valid')
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new OutboundUrlError('URL must start with http:// or https://')
  }
  if (!url.hostname) throw new OutboundUrlError('URL needs a host')
  if (url.username || url.password) {
    throw new OutboundUrlError('URL must not contain credentials')
  }
  return url
}

export async function resolveOutboundUrl(
  value: string | URL,
  allowPrivate = privateAddressesAllowed()
): Promise<ResolvedTarget> {
  const url = parseOutboundUrl(String(value))
  const host = url.hostname.replace(/^\[|\]$/g, '')
  const literal = isIP(host)
  const addresses = literal
    ? [{ address: host, family: literal }]
    : await lookup(host, { all: true, verbatim: true }).catch(() => {
        throw new OutboundUrlError(`Could not resolve ${host}`)
      })
  if (!addresses.length) throw new OutboundUrlError(`Could not resolve ${host}`)
  if (!allowPrivate && addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new OutboundUrlError(`${host} points to a private or reserved address`)
  }
  const [first] = addresses
  return { url, address: first.address, family: first.family === 6 ? 6 : 4 }
}

export async function validateOutboundUrl(value: string) {
  try {
    await resolveOutboundUrl(value)
    return null
  } catch (error) {
    return error instanceof OutboundUrlError ? error.message : 'URL is not reachable'
  }
}

function bodyOf(body: RequestInit['body']) {
  if (body === undefined || body === null) return null
  if (typeof body === 'string') return Buffer.from(body)
  if (body instanceof URLSearchParams) return Buffer.from(body.toString())
  if (body instanceof ArrayBuffer) return Buffer.from(body)
  if (ArrayBuffer.isView(body)) return Buffer.from(body.buffer, body.byteOffset, body.byteLength)
  throw new OutboundUrlError('safeFetch supports string, URLSearchParams and binary bodies')
}

export async function safeFetch(
  value: string | URL,
  init: RequestInit = {},
  options: SafeFetchOptions = {}
): Promise<Response> {
  const { timeout = 10_000, connectTimeout = 5_000, maxBytes = 5 * 1024 * 1024 } = options
  const target = await resolveOutboundUrl(value, options.allowPrivate ?? privateAddressesAllowed())
  const body = bodyOf(init.body)
  const headers = new Headers(init.headers)
  if (body && !headers.has('content-length')) headers.set('content-length', String(body.length))
  const signals = [AbortSignal.timeout(timeout), init.signal].filter(Boolean) as AbortSignal[]
  const signal = AbortSignal.any(signals)
  const client = target.url.protocol === 'https:' ? https : http

  return new Promise<Response>((resolve, reject) => {
    const request = client.request(
      target.url,
      {
        method: (init.method ?? 'GET').toUpperCase(),
        headers: Object.fromEntries(headers.entries()),
        signal,
        lookup: (_hostname, lookupOptions, callback) =>
          lookupOptions.all
            ? callback(null, [{ address: target.address, family: target.family }])
            : callback(null, target.address, target.family),
      },
      (response) => {
        const chunks: Buffer[] = []
        let size = 0
        response.on('data', (chunk: Buffer) => {
          size += chunk.length
          if (size > maxBytes) {
            request.destroy(new OutboundUrlError('Response body too large'))
            return
          }
          chunks.push(chunk)
        })
        response.on('error', reject)
        response.on('end', () => {
          const status = response.statusCode ?? 502
          const responseHeaders = new Headers()
          for (const [name, header] of Object.entries(response.headers)) {
            if (header === undefined) continue
            for (const item of Array.isArray(header) ? header : [header]) {
              responseHeaders.append(name, item)
            }
          }
          const empty = status === 204 || status === 205 || status === 304
          resolve(
            new Response(empty ? null : Buffer.concat(chunks), {
              status: status < 200 ? 502 : status,
              statusText: response.statusMessage,
              headers: responseHeaders,
            })
          )
        })
      }
    )
    const connectTimer = setTimeout(
      () => request.destroy(new OutboundUrlError('Connection timed out')),
      connectTimeout
    )
    request.on('socket', (socket) => {
      const ready = () => clearTimeout(connectTimer)
      socket.once(target.url.protocol === 'https:' ? 'secureConnect' : 'connect', ready)
      if (!socket.connecting) ready()
    })
    request.on('close', () => clearTimeout(connectTimer))
    request.on('error', reject)
    request.end(body ?? undefined)
  })
}
