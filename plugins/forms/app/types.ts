export const FORM_FIELD_TYPES = [
  'text',
  'email',
  'tel',
  'textarea',
  'select',
  'radio',
  'checkbox',
  'number',
  'date',
  'file',
] as const

export type FormFieldType = (typeof FORM_FIELD_TYPES)[number]

export type FormField = {
  name: string
  label: string
  type: FormFieldType
  required?: boolean
  placeholder?: string
  help?: string
  options?: string[]
  accept?: string
}

export type FormStatus = 'draft' | 'published'

export type FormOption = { id: number; title: string; slug: string; status: FormStatus }

export const CAPTCHA_PROVIDERS = ['none', 'turnstile', 'recaptcha'] as const

export type CaptchaProvider = (typeof CAPTCHA_PROVIDERS)[number]

export type PublicCaptcha = { provider: 'turnstile' | 'recaptcha'; siteKey: string; field: string }

export type ResolvedForm = {
  id: number
  slug: string
  title: string
  fields: FormField[]
  submitLabel: string
  successMessage: string | null
  submitUrl: string | null
  action: string
  honeypot: string
  captcha: PublicCaptcha | null
}

export const EMAIL_KINDS = ['notification', 'confirmation'] as const

export type EmailKind = (typeof EMAIL_KINDS)[number]

export type FormEmailData = {
  enabled: boolean
  recipients: string
  fromField: string
  subject: string
  body: string
}

export type FormSummary = {
  id: number
  title: string
  slug: string
  status: FormStatus
  updatedAt: string | null
  submissionsCount: number
  unreadCount: number
  lastSubmissionAt: string | null
}

export type FormDetail = {
  id: number
  title: string
  slug: string
  status: FormStatus
  fields: FormField[]
  submitLabel: string
  successMessage: string
  submitUrl: string
  webhookUrl: string
  emails: Record<EmailKind, FormEmailData>
  createdAt: string | null
  updatedAt: string | null
}

export const SUBMISSION_STATUSES = ['new', 'read', 'spam'] as const

export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number]

export type StoredFile = { name: string; size: number; type: string | null; key: string }

export type SubmissionValue = string | boolean | StoredFile | null

export type SubmissionMeta = {
  pageUrl?: string | null
  userAgent?: string | null
  emails?: Partial<Record<EmailKind, 'sent' | 'failed'>>
  webhook?: { status: number | null; at: string } | null
  reason?: string
}

export type SubmissionRow = {
  id: number
  formId: number
  formTitle: string
  formSlug: string
  fields: { name: string; label: string }[]
  status: SubmissionStatus
  data: Record<string, SubmissionValue>
  ip: string | null
  meta: SubmissionMeta
  createdAt: string | null
  summary: string
}

export type FormsSettingsView = {
  fromName: string
  fromEmail: string
  defaultRecipients: string
  captchaProvider: CaptchaProvider
  turnstileSiteKey: string
  recaptchaSiteKey: string
  turnstileSecretMask: string | null
  recaptchaSecretMask: string | null
  spamRetentionDays: number
}

export const HONEYPOT_FIELD = 'website'
export const TURNSTILE_FIELD = 'cf-turnstile-response'
export const RECAPTCHA_FIELD = 'g-recaptcha-response'
