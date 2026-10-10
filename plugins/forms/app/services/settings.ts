import Setting from '#models/setting'
import { getSecrets, setSecrets } from '#services/secrets'
import type { CaptchaProvider, FormsSettingsView, PublicCaptcha } from '../types.js'
import { RECAPTCHA_FIELD, TURNSTILE_FIELD } from '../types.js'

const SETTINGS_KEY = 'forms'

export type FormsSettings = {
  fromName: string
  fromEmail: string
  defaultRecipients: string
  captchaProvider: CaptchaProvider
  turnstileSiteKey: string
  turnstileSecretKey: string
  recaptchaSiteKey: string
  recaptchaSecretKey: string
  spamRetentionDays: number
}

export const DEFAULT_FORMS_SETTINGS: FormsSettings = {
  fromName: '',
  fromEmail: '',
  defaultRecipients: '',
  captchaProvider: 'none',
  turnstileSiteKey: '',
  turnstileSecretKey: '',
  recaptchaSiteKey: '',
  recaptchaSecretKey: '',
  spamRetentionDays: 30,
}

async function legacySettings(): Promise<Partial<FormsSettings>> {
  const rows = await Setting.query().whereIn('key', ['turnstileSiteKey', 'turnstileSecretKey'])
  const legacy = Object.fromEntries(rows.map((row) => [row.key, String(row.value ?? '')]))
  if (!legacy.turnstileSiteKey || !legacy.turnstileSecretKey) return {}
  return {
    captchaProvider: 'turnstile',
    turnstileSiteKey: legacy.turnstileSiteKey,
    turnstileSecretKey: legacy.turnstileSecretKey,
  }
}

const SECRET_KEYS = ['turnstileSecretKey', 'recaptchaSecretKey'] as const

export async function getFormsSettings(): Promise<FormsSettings> {
  const row = await Setting.findBy('key', SETTINGS_KEY)
  const stored = row ? (row.value as Partial<FormsSettings>) : await legacySettings()
  const secrets = row ? await getSecrets(SETTINGS_KEY) : {}
  return { ...DEFAULT_FORMS_SETTINGS, ...stored, ...secrets }
}

export async function updateFormsSettings(values: FormsSettings) {
  const plain: Partial<FormsSettings> = { ...values }
  for (const key of SECRET_KEYS) delete plain[key]
  await Setting.updateOrCreate({ key: SETTINGS_KEY }, { key: SETTINGS_KEY, value: plain })
  await setSecrets(SETTINGS_KEY, {
    turnstileSecretKey: values.turnstileSecretKey,
    recaptchaSecretKey: values.recaptchaSecretKey,
  })
}

export function captchaSecret(settings: FormsSettings, provider: CaptchaProvider) {
  if (provider === 'turnstile') return settings.turnstileSecretKey
  if (provider === 'recaptcha') return settings.recaptchaSecretKey
  return ''
}

export function publicCaptcha(settings: FormsSettings): PublicCaptcha | null {
  const provider = settings.captchaProvider
  if (provider === 'turnstile' && settings.turnstileSiteKey && captchaSecret(settings, provider)) {
    return { provider, siteKey: settings.turnstileSiteKey, field: TURNSTILE_FIELD }
  }
  if (provider === 'recaptcha' && settings.recaptchaSiteKey && captchaSecret(settings, provider)) {
    return { provider, siteKey: settings.recaptchaSiteKey, field: RECAPTCHA_FIELD }
  }
  return null
}

function mask(secret: string) {
  if (!secret) return null
  return `${'•'.repeat(8)}${secret.slice(-4)}`
}

export function settingsView(settings: FormsSettings): FormsSettingsView {
  return {
    fromName: settings.fromName,
    fromEmail: settings.fromEmail,
    defaultRecipients: settings.defaultRecipients,
    captchaProvider: settings.captchaProvider,
    turnstileSiteKey: settings.turnstileSiteKey,
    recaptchaSiteKey: settings.recaptchaSiteKey,
    turnstileSecretMask: mask(captchaSecret(settings, 'turnstile')),
    recaptchaSecretMask: mask(captchaSecret(settings, 'recaptcha')),
    spamRetentionDays: settings.spamRetentionDays,
  }
}

export function recipientList(value: string | null | undefined) {
  return (value ?? '')
    .split(/[,\n]/)
    .map((email) => email.trim())
    .filter(Boolean)
}
