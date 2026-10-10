import vine, { errors } from '@vinejs/vine'
import { OG_TYPES, SCHEMA_TYPES, STATUSES, TWITTER_CARDS, type Seo } from '#types/content'

export const slugRule = () =>
  vine
    .string()
    .trim()
    .regex(/^[a-z0-9][a-z0-9-]*$/)
    .maxLength(120)

export const blocksRule = () =>
  vine.array(
    vine.object({
      id: vine.string(),
      type: vine.string(),
      version: vine.number().withoutDecimals().min(1).optional(),
      data: vine.object({}).allowUnknownProperties(),
    })
  )

const optionalText = (max = 500) => vine.string().trim().maxLength(max).optional()

export const seoRule = () =>
  vine
    .object({
      title: optionalText(200),
      description: optionalText(500),
      canonicalUrl: vine.string().trim().url({ require_protocol: true }).maxLength(2000).optional(),
      focusKeyword: optionalText(200),
      noindex: vine.boolean().optional(),
      nofollow: vine.boolean().optional(),
      imageId: vine.number().nullable().optional(),
      ogTitle: optionalText(200),
      ogDescription: optionalText(500),
      ogType: vine.enum(OG_TYPES.map((option) => option.value)).optional(),
      twitterCard: vine.enum(TWITTER_CARDS.map((option) => option.value)).optional(),
      schemaType: vine.enum(SCHEMA_TYPES.map((option) => option.value)).optional(),
      jsonLd: vine.any().optional(),
    })
    .allowUnknownProperties()

export function normalizeSeo(seo: Record<string, unknown>): Seo {
  const cleaned: Record<string, unknown> = Object.fromEntries(
    Object.entries(seo).filter(([, value]) => value !== '' && value !== null && value !== undefined)
  )
  let jsonLd = cleaned.jsonLd
  if (typeof jsonLd === 'string') {
    try {
      jsonLd = JSON.parse(jsonLd)
    } catch (error) {
      throw new errors.E_VALIDATION_ERROR([
        {
          field: 'seo.jsonLd',
          message: `Isn't valid JSON: ${(error as Error).message}`,
          rule: 'json',
        },
      ])
    }
  }
  if (jsonLd === undefined || jsonLd === null) {
    delete cleaned.jsonLd
    return cleaned as Seo
  }
  const nodes = Array.isArray(jsonLd) ? jsonLd : [jsonLd]
  const isObject = (node: unknown): node is Record<string, unknown> =>
    !!node && typeof node === 'object' && !Array.isArray(node)
  const message = nodes.some((node) => !isObject(node))
    ? 'Must be an object or a list of objects'
    : nodes.some((node) => isObject(node) && !('@type' in node) && !Array.isArray(node['@graph']))
      ? 'Every node needs an @type'
      : null
  if (message) {
    throw new errors.E_VALIDATION_ERROR([{ field: 'seo.jsonLd', message, rule: 'jsonLd' }])
  }
  cleaned.jsonLd = jsonLd
  return cleaned as Seo
}

export const workflowRules = () => ({
  status: vine.enum(STATUSES).optional(),
  publishAt: vine
    .date({ formats: { utc: true } })
    .nullable()
    .optional(),
  unpublishAt: vine
    .date({ formats: { utc: true } })
    .nullable()
    .optional(),
  lockVersion: vine.number().withoutDecimals().min(0).optional(),
})

export const fieldsRule = () => vine.array(vine.any())

export const publicationValidator = vine.create({
  publishAt: vine
    .date({ formats: { utc: true } })
    .nullable()
    .optional(),
})
