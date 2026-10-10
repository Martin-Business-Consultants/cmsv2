import encryption from '@adonisjs/core/services/encryption'
import Setting from '#models/setting'
import { changeSetting } from '#services/settings'

const PURPOSE = 'settings.secrets'

export type SecretValues = Record<string, string>

export function encryptSetting(value: unknown) {
  return encryption.encrypt(value, { purpose: PURPOSE })
}

export function decryptSetting<T = unknown>(cipher: string | null | undefined): T | null {
  if (!cipher) return null
  try {
    return encryption.decrypt<T>(cipher, PURPOSE)
  } catch {
    return null
  }
}

function readSecrets(row: Pick<Setting, 'secrets'> | null): SecretValues {
  const values = decryptSetting<SecretValues>(row?.secrets)
  return values && typeof values === 'object' && !Array.isArray(values) ? values : {}
}

export async function getSecrets(key: string): Promise<SecretValues> {
  return readSecrets(await Setting.findBy('key', key))
}

export async function getSecret(key: string, name: string): Promise<string | null> {
  const secrets = await getSecrets(key)
  const value = secrets[name]
  return typeof value === 'string' && value.trim() ? value : null
}

export async function setSecrets(key: string, values: Record<string, string | null | undefined>) {
  let result: SecretValues = {}
  await changeSetting(key, (current, row) => {
    const merged: SecretValues = { ...readSecrets(row) }
    for (const [name, value] of Object.entries(values)) {
      if (value === undefined) continue
      if (value === null || !String(value).trim()) delete merged[name]
      else merged[name] = String(value)
    }
    row.secrets = Object.keys(merged).length ? encryptSetting(merged) : null
    result = merged
    return current ?? {}
  })
  return result
}

export async function reencryptSecrets() {
  const tally = { rewritten: 0, unreadable: 0 }
  for (const row of await Setting.query().whereNotNull('secrets')) {
    const values = decryptSetting<SecretValues>(row.secrets)
    if (values === null) {
      tally.unreadable += 1
      continue
    }
    row.secrets = encryptSetting(values)
    await row.save()
    tally.rewritten += 1
  }
  return tally
}

export function secretHint(value: string | null | undefined) {
  if (!value) return null
  return value.length > 8 ? `ends in ${value.slice(-4)}` : 'set'
}
