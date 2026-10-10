import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import QRCode from 'qrcode'

export const STEP_SECONDS = 30
export const CODE_DIGITS = 6
export const RECOVERY_CODES = 10
const DRIFT = [-1, 0, 1]
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export function encodeBase32(bytes: Buffer) {
  let bits = ''
  for (const byte of bytes) bits += byte.toString(2).padStart(8, '0')
  let output = ''
  for (let index = 0; index < bits.length; index += 5) {
    output += ALPHABET[Number.parseInt(bits.slice(index, index + 5).padEnd(5, '0'), 2)]
  }
  return output
}

export function decodeBase32(value: string) {
  const cleaned = value.toUpperCase().replace(/[^A-Z2-7]/g, '')
  let bits = ''
  for (const char of cleaned) bits += ALPHABET.indexOf(char).toString(2).padStart(5, '0')
  const bytes: number[] = []
  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(Number.parseInt(bits.slice(index, index + 8), 2))
  }
  return Buffer.from(bytes)
}

export function randomSecret() {
  return encodeBase32(randomBytes(10))
}

export function codeAt(secret: string, counter: number) {
  const message = Buffer.alloc(8)
  message.writeBigUInt64BE(BigInt(counter))
  const hmac = createHmac('sha1', decodeBase32(secret)).update(message).digest()
  const offset = hmac[hmac.length - 1] & 0x0f
  const binary = (hmac.readUInt32BE(offset) & 0x7fffffff) % 10 ** CODE_DIGITS
  return binary.toString().padStart(CODE_DIGITS, '0')
}

export function currentCode(secret: string, at = Date.now()) {
  return codeAt(secret, Math.floor(at / 1000 / STEP_SECONDS))
}

export function verifyCode(secret: string | null, code: string, at = Date.now()) {
  const normalized = code.replace(/\s+/g, '')
  if (!secret || !new RegExp(`^\\d{${CODE_DIGITS}}$`).test(normalized)) return false
  const counter = Math.floor(at / 1000 / STEP_SECONDS)
  return DRIFT.some((drift) =>
    timingSafeEqual(Buffer.from(codeAt(secret, counter + drift)), Buffer.from(normalized))
  )
}

export function provisioningUri(secret: string, account: string, issuer: string) {
  const label = encodeURIComponent(`${issuer}:${account}`)
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: String(CODE_DIGITS),
    period: String(STEP_SECONDS),
  })
  return `otpauth://totp/${label}?${params.toString().replace(/\+/g, '%20')}`
}

export function qrCodeSvg(text: string) {
  return QRCode.toString(text, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' })
}

export function digestRecoveryCode(code: string) {
  return createHash('sha256').update(code.trim().toLowerCase()).digest('hex')
}

export function generateRecoveryCodes() {
  const codes = Array.from({ length: RECOVERY_CODES }, () => randomBytes(8).toString('hex'))
  return { codes, digests: codes.map(digestRecoveryCode) }
}
