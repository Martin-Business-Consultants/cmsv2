import { errors } from '@vinejs/vine'
import logger from '@adonisjs/core/services/logger'
import app from '@adonisjs/core/services/app'
import { randomUUID } from 'node:crypto'
import type { MultipartFile } from '@adonisjs/core/bodyparser'
import type { FieldError } from '#services/fields'
import { absoluteUrl } from '#services/delivery'
import Form from '../models/form.js'
import type { ModelAttributes } from '@adonisjs/lucid/types/model'
import type FormSubmission from '../models/form_submission.js'
import {
  HONEYPOT_FIELD,
  RECAPTCHA_FIELD,
  TURNSTILE_FIELD,
  type FormDetail,
  type FormField,
  EMAIL_KINDS,
  type ResolvedForm,
  type StoredFile,
  type SubmissionRow,
  type SubmissionValue,
} from '../types.js'
import { captchaSecret, publicCaptcha, type FormsSettings } from './settings.js'
import FormEmail from '../models/form_email.js'

const NAME_FORMAT = /^[a-z][a-z0-9_]*$/
const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/
const MAX_LENGTH = 5000
const RESERVED = new Set([HONEYPOT_FIELD, TURNSTILE_FIELD, RECAPTCHA_FIELD, 'page_url'])
const VERIFY_URLS = {
  turnstile: 'https://challenges.cloudflare.com/turnstile/v0/siteverify',
  recaptcha: 'https://www.google.com/recaptcha/api/siteverify',
}

export const MAX_FILE_SIZE = '10mb'
export const UPLOADS_PATH = 'storage/form_uploads'

type FieldInput = {
  name: string | null
  label: string
  type: FormField['type']
  required?: boolean | null
  placeholder?: string | null
  help?: string | null
  options?: (string | null)[] | null
  accept?: string | null
}

export function validateFormFields(fields: FieldInput[]): FieldError[] {
  const out: FieldError[] = []
  const seen = new Set<string>()
  fields.forEach((field, index) => {
    const at = `fields.${index}`
    const name = field.name ?? ''
    if (!NAME_FORMAT.test(name)) {
      out.push({
        field: `${at}.name`,
        message: 'Use lowercase letters, numbers and underscores, starting with a letter',
        rule: 'regex',
      })
    } else if (seen.has(name)) {
      out.push({ field: `${at}.name`, message: `"${name}" is used twice`, rule: 'unique' })
    } else if (RESERVED.has(name)) {
      out.push({ field: `${at}.name`, message: `"${name}" is reserved`, rule: 'reserved' })
    }
    seen.add(name)
    if (
      (field.type === 'select' || field.type === 'radio') &&
      !(field.options ?? []).some(Boolean)
    ) {
      out.push({ field: `${at}.options`, message: 'Add at least one option', rule: 'required' })
    }
  })
  if (fields.length === 0) {
    out.push({ field: 'fields', message: 'Add at least one field', rule: 'required' })
  }
  return out
}

export function cleanFormFields(fields: FieldInput[]): FormField[] {
  return fields.map((field) => {
    const clean: FormField = { name: field.name ?? '', label: field.label, type: field.type }
    if (field.required) clean.required = true
    if (field.placeholder) clean.placeholder = field.placeholder
    if (field.help) clean.help = field.help
    if (field.type === 'select' || field.type === 'radio') {
      clean.options = (field.options ?? []).filter((option): option is string => Boolean(option))
    }
    if (field.type === 'file' && field.accept) clean.accept = field.accept
    return clean
  })
}

export function extensionsOf(accept: string | undefined) {
  return (accept ?? '')
    .split(',')
    .map((item) => item.trim().replace(/^\./, '').toLowerCase())
    .filter(Boolean)
}

function isChecked(value: unknown) {
  return value === true || value === 'true' || value === 'on' || value === '1' || value === 1
}

export function validateSubmission(
  fields: FormField[],
  input: Record<string, unknown>,
  files: Record<string, MultipartFile | null>
) {
  const out: FieldError[] = []
  const data: Record<string, SubmissionValue> = {}

  for (const field of fields) {
    const raw = input[field.name]
    const label = field.label || field.name
    const fail = (message: string, rule: string) => out.push({ field: field.name, message, rule })

    if (field.type === 'checkbox') {
      const checked = isChecked(raw)
      if (field.required && !checked) fail(`${label} is required`, 'required')
      data[field.name] = checked
      continue
    }

    if (field.type === 'file') {
      const file = files[field.name]
      if (!file) {
        if (field.required) fail(`${label} is required`, 'required')
        continue
      }
      if (!file.isValid) {
        const error = file.errors[0]
        fail(
          error?.type === 'size'
            ? `${label} must be at most ${MAX_FILE_SIZE.toUpperCase()}`
            : error?.type === 'extname'
              ? `${label} must be one of: ${extensionsOf(field.accept).join(', ')}`
              : `${label} could not be uploaded`,
          'file'
        )
      }
      continue
    }

    if (raw !== undefined && raw !== null && typeof raw !== 'string' && typeof raw !== 'number') {
      fail(`${label} is invalid`, 'string')
      continue
    }
    const value = raw === undefined || raw === null ? '' : String(raw).trim()

    if (!value) {
      if (field.required) fail(`${label} is required`, 'required')
      continue
    }
    if (value.length > MAX_LENGTH) {
      fail(`${label} must be at most ${MAX_LENGTH} characters`, 'maxLength')
      continue
    }
    if (field.type !== 'textarea' && value.length > 500) {
      fail(`${label} must be at most 500 characters`, 'maxLength')
      continue
    }

    switch (field.type) {
      case 'email':
        if (!EMAIL_FORMAT.test(value)) fail(`${label} must be a valid email address`, 'email')
        break
      case 'number':
        if (!Number.isFinite(Number(value))) fail(`${label} must be a number`, 'number')
        break
      case 'date':
        if (!DATE_FORMAT.test(value) || Number.isNaN(Date.parse(value))) {
          fail(`${label} must be a valid date`, 'date')
        }
        break
      case 'select':
      case 'radio':
        if (!(field.options ?? []).includes(value))
          fail(`Pick one of the options for ${label}`, 'enum')
        break
    }
    data[field.name] = value
  }

  return { errors: out, data }
}

export async function storeFiles(
  form: Form,
  fields: FormField[],
  files: Record<string, MultipartFile | null>,
  data: Record<string, SubmissionValue>
) {
  for (const field of fields.filter((item) => item.type === 'file')) {
    const file = files[field.name]
    if (!file?.isValid) continue
    const key = `${form.id}/${randomUUID().replace(/-/g, '')}${file.extname ? `.${file.extname}` : ''}`
    const [directory, name] = key.split('/')
    await file.move(app.makePath(UPLOADS_PATH, directory), { name })
    const stored: StoredFile = {
      name: file.clientName.slice(0, 200),
      size: file.size,
      type: file.headers['content-type'] ?? null,
      key,
    }
    data[field.name] = stored
  }
}

export function storedFilePath(key: string) {
  if (!/^\d+\/[a-z0-9]+(\.[a-z0-9]+)?$/i.test(key)) return null
  return app.makePath(UPLOADS_PATH, key)
}

export function throwFieldErrors(fieldErrors: FieldError[]): never {
  throw new errors.E_VALIDATION_ERROR(fieldErrors)
}

export async function verifyCaptcha(
  settings: FormsSettings,
  input: Record<string, unknown>,
  ip: string
) {
  const captcha = publicCaptcha(settings)
  if (!captcha) return true
  const token = input[captcha.field]
  if (typeof token !== 'string' || !token) return false

  try {
    const response = await fetch(VERIFY_URLS[captcha.provider], {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: captchaSecret(settings, captcha.provider),
        response: token,
        remoteip: ip,
      }),
      signal: AbortSignal.timeout(10_000),
    })
    const result = (await response.json()) as { 'success'?: boolean; 'error-codes'?: string[] }
    if (!result.success) {
      logger.info({ codes: result['error-codes'], provider: captcha.provider }, 'Captcha failed')
    }
    return Boolean(result.success)
  } catch (error) {
    logger.error({ err: error, provider: captcha.provider }, 'Captcha verification failed')
    return false
  }
}

export function displayValue(value: unknown) {
  if (value === true) return 'Yes'
  if (value === false) return 'No'
  if (value === undefined || value === null) return ''
  if (typeof value === 'object' && 'name' in value) return String(value.name)
  return String(value)
}

export function toCsv(rows: unknown[][]) {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          let text = cell === undefined || cell === null ? '' : String(cell)
          if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`
          return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
        })
        .join(',')
    )
    .join('\r\n')
}

export function actionPath(form: Form) {
  return `/forms/${form.slug}`
}

export function resolveForm(
  form: Form,
  settings: FormsSettings,
  options: { absolute?: boolean } = {}
): ResolvedForm {
  return {
    id: form.id,
    slug: form.slug,
    title: form.title,
    fields: form.fields,
    submitLabel: form.submitLabel || 'Submit',
    successMessage: form.successMessage,
    submitUrl: form.submitUrl,
    action: options.absolute ? absoluteUrl(actionPath(form)) : actionPath(form),
    honeypot: HONEYPOT_FIELD,
    captcha: publicCaptcha(settings),
  }
}

export function emailDefaults() {
  return {
    notification: {
      enabled: false,
      recipients: '',
      fromField: '',
      subject: '[{{form_title}}] New submission #{{submission_id}}',
      body: 'A new submission has arrived for **{{form_title}}**.\n\n{{answers}}',
    },
    confirmation: {
      enabled: false,
      recipients: '',
      fromField: '',
      subject: 'Thanks for your message',
      body: 'Hi {{name}},\n\nThanks for reaching out. We will get back to you soon.\n\nHere is what you sent us:\n\n{{answers}}',
    },
  }
}

export async function serializeFormDetail(form: Form): Promise<FormDetail> {
  const emails = await FormEmail.query().where('form_id', form.id)
  const defaults = emailDefaults()
  const byKind = (kind: 'notification' | 'confirmation') => {
    const email = emails.find((item) => item.kind === kind)
    if (!email) return defaults[kind]
    return {
      enabled: email.enabled,
      recipients: email.recipients ?? '',
      fromField: email.fromField ?? '',
      subject: email.subject,
      body: email.body,
    }
  }
  return {
    id: form.id,
    title: form.title,
    slug: form.slug,
    status: form.status,
    fields: form.fields,
    submitLabel: form.submitLabel,
    successMessage: form.successMessage ?? '',
    submitUrl: form.submitUrl ?? '',
    webhookUrl: form.webhookUrl ?? '',
    emails: { notification: byKind('notification'), confirmation: byKind('confirmation') },
    createdAt: form.createdAt?.toISO() ?? null,
    updatedAt: form.updatedAt?.toISO() ?? null,
  }
}

export function summarize(form: Form | undefined, data: Record<string, SubmissionValue>) {
  const fields = form?.fields ?? []
  const preferred = ['name', 'full_name', 'email', 'subject', 'message']
  const ordered = [
    ...preferred.filter((name) => fields.some((field) => field.name === name)),
    ...fields.map((field) => field.name).filter((name) => !preferred.includes(name)),
  ]
  return ordered
    .map((name) => displayValue(data[name]))
    .filter(Boolean)
    .slice(0, 3)
    .join(' · ')
    .slice(0, 200)
}

export function serializeSubmission(submission: FormSubmission): SubmissionRow {
  const form = submission.$preloaded.form as Form | undefined
  return {
    id: submission.id,
    formId: submission.formId,
    formTitle: form?.title ?? 'Deleted form',
    formSlug: form?.slug ?? '',
    fields: (form?.fields ?? []).map((field) => ({
      name: field.name,
      label: field.label || field.name,
    })),
    status: submission.status,
    data: submission.data ?? {},
    ip: submission.ip,
    meta: { ...(submission.meta ?? {}), userAgent: submission.userAgent },
    createdAt: submission.createdAt?.toISO() ?? null,
    summary: summarize(form, submission.data ?? {}),
  }
}

export async function createForm(
  attributes: Partial<ModelAttributes<Form>>,
  emails = emailDefaults()
) {
  const form = await Form.create(attributes)
  for (const kind of EMAIL_KINDS) {
    await FormEmail.create({
      formId: form.id,
      kind,
      ...emails[kind],
      recipients: emails[kind].recipients || null,
      fromField: emails[kind].fromField || null,
    })
  }
  return form
}
