import vine, { SimpleMessagesProvider } from '@vinejs/vine'
import { slugRule } from '#validators/content'
import { CAPTCHA_PROVIDERS, FORM_FIELD_TYPES, SUBMISSION_STATUSES } from '../types.js'

const emailList = /^\s*([^\s@,]+@[^\s@,]+\.[^\s@,]+\s*([,\n]\s*[^\s@,]+@[^\s@,]+\.[^\s@,]+\s*)*)?$/

const email = () =>
  vine.object({
    enabled: vine.boolean(),
    recipients: vine.string().trim().maxLength(1000).regex(emailList).nullable().optional(),
    fromField: vine.string().trim().maxLength(100).nullable().optional(),
    subject: vine.string().trim().maxLength(250).nullable().optional(),
    body: vine.string().maxLength(20000).nullable().optional(),
  })

export const formValidator = vine.create({
  title: vine.string().trim().minLength(1).maxLength(200),
  slug: slugRule(),
  status: vine.enum(['draft', 'published']),
  fields: vine.array(
    vine.object({
      name: vine.string().trim().nullable(),
      label: vine.string().trim().minLength(1).maxLength(200),
      type: vine.enum(FORM_FIELD_TYPES),
      required: vine.boolean().nullable().optional(),
      placeholder: vine.string().trim().maxLength(200).nullable().optional(),
      help: vine.string().trim().maxLength(500).nullable().optional(),
      options: vine.array(vine.string().trim().maxLength(200).nullable()).nullable().optional(),
      accept: vine.string().trim().maxLength(200).nullable().optional(),
    })
  ),
  submitLabel: vine.string().trim().maxLength(80).nullable().optional(),
  successMessage: vine.string().trim().maxLength(1000).nullable().optional(),
  submitUrl: vine
    .string()
    .trim()
    .maxLength(500)
    .regex(/^(https?:\/\/|\/)\S*$/)
    .nullable()
    .optional(),
  webhookUrl: vine
    .string()
    .trim()
    .maxLength(500)
    .url({ require_protocol: true, require_tld: false, protocols: ['http', 'https'] })
    .nullable()
    .optional(),
  emails: vine.object({ notification: email(), confirmation: email() }),
})

formValidator.messagesProvider = new SimpleMessagesProvider({
  'required': 'This field is required',
  'maxLength': 'Must be at most {{ max }} characters',
  'title.required': 'Give the form a title',
  'slug.required': 'Add a slug',
  'slug.regex': 'Use lowercase letters, numbers and dashes',
  'fields.*.label.required': 'Give the field a label',
  'fields.*.label.minLength': 'Give the field a label',
  'submitUrl.regex': 'Enter a full URL or a path starting with /',
  'webhookUrl.url': 'Enter a full http(s) URL',
  'emails.*.recipients.regex': 'Enter email addresses separated by commas',
})

export const formsSettingsValidator = vine.create({
  fromName: vine.string().trim().maxLength(100).nullable().optional(),
  fromEmail: vine.string().trim().email().maxLength(254).nullable().optional(),
  defaultRecipients: vine.string().trim().maxLength(1000).regex(emailList).nullable().optional(),
  captchaProvider: vine.enum(CAPTCHA_PROVIDERS),
  turnstileSiteKey: vine.string().trim().maxLength(200).nullable().optional(),
  turnstileSecretKey: vine.string().trim().maxLength(200).nullable().optional(),
  recaptchaSiteKey: vine.string().trim().maxLength(200).nullable().optional(),
  recaptchaSecretKey: vine.string().trim().maxLength(200).nullable().optional(),
  spamRetentionDays: vine.number().withoutDecimals().min(0).max(3650),
})

formsSettingsValidator.messagesProvider = new SimpleMessagesProvider({
  'required': 'This field is required',
  'email': 'Enter a valid email address',
  'defaultRecipients.regex': 'Enter email addresses separated by commas',
  'spamRetentionDays.min': 'Use 0 to keep spam forever',
})

export const submissionStatusValidator = vine.create({
  status: vine.enum(SUBMISSION_STATUSES),
})

export const bulkSubmissionsValidator = vine.create({
  ids: vine.array(vine.number().withoutDecimals()).minLength(1).maxLength(500),
  action: vine.enum(['delete', 'read', 'new', 'spam']),
})
