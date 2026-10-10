import { marked } from 'marked'
import mail from '@adonisjs/mail/services/main'
import env from '#start/env'
import { getSettings } from '#services/settings'
import { plugins } from '#services/plugins'
import { absoluteUrl } from '#services/delivery'
import type Form from '../models/form.js'
import FormSubmission from '../models/form_submission.js'
import FormEmail from '../models/form_email.js'
import FormEmailMessage from '../mails/form_email_message.js'
import type { EmailKind, FormField, SubmissionMeta } from '../types.js'
import { displayValue } from './forms.js'
import { getFormsSettings, recipientList, type FormsSettings } from './settings.js'

const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PLACEHOLDER = /\{\{\s*([a-z0-9_]+)\s*\}\}/gi

type Row = { label: string; value: string }

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function answerRows(fields: FormField[], submission: FormSubmission): Row[] {
  return fields.map((field) => ({
    label: field.label || field.name,
    value: displayValue(submission.data[field.name]) || '—',
  }))
}

function answersHtml(rows: Row[]) {
  const cells = rows
    .map(
      (row) =>
        `<tr><td style="padding:8px 12px 8px 0;border-top:1px solid #e5e5e5;color:#737373;vertical-align:top;width:35%;">${escapeHtml(row.label)}</td><td style="padding:8px 0;border-top:1px solid #e5e5e5;vertical-align:top;white-space:pre-wrap;">${escapeHtml(row.value)}</td></tr>`
    )
    .join('')
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px;margin:8px 0;">${cells}</table>`
}

function answersText(rows: Row[]) {
  return rows.map((row) => `${row.label}:\n${row.value}`).join('\n\n')
}

export function templateVariables(form: Form, submission: FormSubmission, siteName: string) {
  const values: Record<string, string> = {
    form_title: form.title,
    form_slug: form.slug,
    submission_id: String(submission.id),
    submitted_at: submission.createdAt.toFormat('d LLL yyyy, HH:mm ZZZZ'),
    ip: submission.ip ?? '',
    page_url: submission.meta?.pageUrl ?? '',
    site_name: siteName,
  }
  for (const field of form.fields) values[field.name] = displayValue(submission.data[field.name])
  return values
}

export function renderTemplate(
  template: string,
  values: Record<string, string>,
  rows: Row[]
): { html: string; text: string } {
  const tokens: string[] = []
  const tokenized = template.replace(PLACEHOLDER, (_, key: string) => {
    tokens.push(key)
    return `LPFORMTOKEN${tokens.length - 1}X`
  })
  const rendered = marked.parse(tokenized, { async: false }) as string
  const html = rendered.replace(
    /(<p>)?LPFORMTOKEN(\d+)X(<\/p>)?/g,
    (_match, open, index, close) => {
      const key = tokens[Number(index)]
      if (key === 'answers') return answersHtml(rows)
      const value = escapeHtml(values[key] ?? '').replace(/\n/g, '<br>')
      return `${open ?? ''}${value}${close ?? ''}`
    }
  )
  const text = template.replace(PLACEHOLDER, (_, key: string) =>
    key === 'answers' ? answersText(rows) : (values[key] ?? '')
  )
  return { html, text }
}

export function renderSubject(template: string, values: Record<string, string>) {
  return template
    .replace(PLACEHOLDER, (_, key: string) => values[key] ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 250)
}

function answerEmail(form: Form, submission: FormSubmission, fieldName: string | null) {
  const names = fieldName
    ? [fieldName]
    : form.fields.filter((field) => field.type === 'email').map((field) => field.name)
  for (const name of names) {
    const value = submission.data[name]
    if (typeof value === 'string' && EMAIL_FORMAT.test(value)) return value
  }
  return null
}

async function logoUrl(logoAssetId: number | null) {
  const media = plugins.provided('media')
  if (!logoAssetId || !media) return null
  const assets = await media.resolve([logoAssetId])
  const asset = assets.get(logoAssetId)
  if (!asset) return null
  return asset.url.startsWith('http') ? asset.url : absoluteUrl(asset.url)
}

function sender(settings: FormsSettings, siteName: string) {
  return {
    address: settings.fromEmail || env.get('MAIL_FROM_ADDRESS'),
    name: settings.fromName || siteName || env.get('MAIL_FROM_NAME'),
  }
}

async function compose(
  kind: EmailKind,
  email: FormEmail,
  form: Form,
  submission: FormSubmission,
  settings: FormsSettings
) {
  const site = await getSettings()
  const values = templateVariables(form, submission, site.siteName)
  const rows = answerRows(form.fields, submission)
  const body = renderTemplate(email.body, values, rows)
  const adminUrl = absoluteUrl(`/admin/submissions/${submission.id}`)
  const to =
    kind === 'notification'
      ? recipientList(email.recipients).length
        ? recipientList(email.recipients)
        : recipientList(settings.defaultRecipients)
      : [answerEmail(form, submission, email.fromField)].filter((value): value is string => !!value)
  if (!to.length) return null

  return new FormEmailMessage({
    from: sender(settings, site.siteName),
    to,
    replyTo:
      kind === 'notification'
        ? answerEmail(form, submission, email.fromField)
        : settings.fromEmail || site.contactEmail || null,
    subject: renderSubject(email.subject, values) || form.title,
    html: {
      siteName: site.siteName,
      logoUrl: await logoUrl(site.logoAssetId),
      bodyHtml: body.html,
      button: kind === 'notification' ? { label: 'Open submission', url: adminUrl } : null,
      footer:
        kind === 'notification'
          ? `You get this email because you are listed as a recipient of the “${form.title}” form.`
          : `You get this email because you sent the “${form.title}” form on ${site.siteName}.`,
    },
    text: kind === 'notification' ? `${body.text}\n\nOpen submission: ${adminUrl}` : body.text,
  })
}

export async function enabledEmailKinds(formId: number) {
  const emails = await FormEmail.query().where('form_id', formId).where('enabled', true)
  return emails.map((email) => email.kind)
}

export async function recordSubmissionMeta(
  id: number,
  changes: (meta: SubmissionMeta) => SubmissionMeta
) {
  const submission = await FormSubmission.find(id)
  if (!submission) return
  submission.meta = changes(submission.meta ?? {})
  await submission.save()
}

export async function sendSubmissionEmail(submissionId: number, kind: EmailKind) {
  const submission = await FormSubmission.query()
    .where('id', submissionId)
    .preload('form')
    .firstOrFail()
  const email = await FormEmail.query()
    .where('form_id', submission.formId)
    .where('kind', kind)
    .where('enabled', true)
    .first()
  if (!email) return false
  const message = await compose(kind, email, submission.form, submission, await getFormsSettings())
  if (!message) return false
  await mail.send(message)
  await recordSubmissionMeta(submission.id, (meta) => ({
    ...meta,
    emails: { ...meta.emails, [kind]: 'sent' },
  }))
  return true
}
