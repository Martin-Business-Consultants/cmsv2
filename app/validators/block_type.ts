import vine from '@vinejs/vine'
import { fieldsRule } from '#validators/content'

const attributes = {
  label: vine.string().trim().minLength(1).maxLength(100),
  category: vine.string().trim().maxLength(60).nullable().optional(),
  description: vine.string().trim().maxLength(500).nullable().optional(),
  icon: vine
    .string()
    .trim()
    .regex(/^[a-z0-9-]+$/)
    .maxLength(60)
    .nullable()
    .optional(),
  fields: fieldsRule(),
  defaults: vine.object({}).allowUnknownProperties(),
  deprecated: vine.boolean().optional(),
  version: vine.number().withoutDecimals().min(1).max(10000).optional(),
}

export const createBlockTypeValidator = vine.create({
  ...attributes,
  slug: vine
    .string()
    .trim()
    .regex(/^[a-z][a-z0-9_]*$/)
    .maxLength(60)
    .unique({ table: 'block_types', column: 'slug' }),
})

export const updateBlockTypeValidator = vine.create(attributes)
