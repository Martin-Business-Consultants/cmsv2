import vine, { SimpleMessagesProvider } from '@vinejs/vine'
import { APPEARANCES, FONTS, RADII, SHADOWS } from '#types/branding'

const assetId = () => vine.number().exists({ table: 'assets', column: 'id' }).nullable().optional()
const text = (max: number) => vine.string().trim().maxLength(max).nullable().optional()
const hexColor = () =>
  vine
    .string()
    .trim()
    .regex(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
    .nullable()
    .optional()

export const generalSettingsValidator = vine.create({
  siteName: vine.string().trim().minLength(1).maxLength(100),
  tagline: text(500),
  defaultLocale: vine
    .string()
    .trim()
    .regex(/^[a-zA-Z]{2,3}([-_][a-zA-Z0-9]{2,8})*$/)
    .nullable()
    .optional(),
  timezone: text(100),
  siteBaseUrl: vine
    .string()
    .trim()
    .url({ require_protocol: true, protocols: ['http', 'https'] })
    .maxLength(255)
    .nullable()
    .optional(),
  publicOrigins: vine.string().maxLength(5000).nullable().optional(),
  contactEmail: vine.string().trim().email().maxLength(254).nullable().optional(),
  phone: text(50),
  addressLine1: text(200),
  city: text(100),
  state: text(100),
  zip: text(20),
  emailFromName: text(100),
  emailFromAddress: vine.string().trim().email().maxLength(254).nullable().optional(),
  homePageId: vine
    .number()
    .exists({
      table: 'pages',
      column: 'id',
      filter: (db) => {
        db.whereNull('deleted_at')
      },
    })
    .nullable()
    .optional(),
  headScripts: vine.string().maxLength(20000).nullable().optional(),
})

export const brandingValidator = vine.create({
  logoAssetId: assetId(),
  faviconAssetId: assetId(),
  primaryColor: hexColor(),
  secondaryColor: hexColor(),
  font: vine
    .enum(Object.keys(FONTS) as (keyof typeof FONTS)[])
    .nullable()
    .optional(),
  borderRadius: vine.enum(RADII).nullable().optional(),
  boxShadow: vine.enum(SHADOWS).nullable().optional(),
  defaultAppearance: vine.enum(APPEARANCES).nullable().optional(),
})

export const brandBriefValidator = vine.create({
  brand_voice: text(5000),
  audience: text(5000),
  key_facts: text(5000),
  style_notes: text(5000),
})

const messages = new SimpleMessagesProvider({
  'required': 'This field is required',
  'email': 'Enter a valid email address',
  'url': 'Enter a full URL, starting with https://',
  'minLength': 'Must be at least {{ min }} characters',
  'maxLength': 'Must be at most {{ max }} characters',
  'enum': 'Choose one of the options',
  'siteName.required': 'Give the site a name',
  'defaultLocale.regex': 'Use a language code such as en or en-US',
  'primaryColor.regex': 'Use a hex color such as #b45309',
  'secondaryColor.regex': 'Use a hex color such as #1c1917',
  'database.exists': 'That item no longer exists',
})

generalSettingsValidator.messagesProvider = messages
brandingValidator.messagesProvider = messages
brandBriefValidator.messagesProvider = messages
