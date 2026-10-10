import vine from '@vinejs/vine'
import { fieldsRule } from '#validators/content'

const details = {
  name: vine.string().trim().minLength(1).maxLength(100),
  slug: vine
    .string()
    .trim()
    .regex(/^[a-z][a-z0-9_-]*$/)
    .maxLength(60),
  description: vine.string().trim().maxLength(255).nullable().optional(),
  icon: vine
    .string()
    .trim()
    .regex(/^[a-z0-9-]*$/)
    .maxLength(60)
    .nullable()
    .optional(),
}

const lockVersion = vine.number().withoutDecimals().min(0).optional()

export const globalValidator = vine.create(details)

export const globalDataValidator = vine.create({
  ...details,
  data: vine.object({}).allowUnknownProperties(),
  lockVersion,
})

export const globalFieldsValidator = vine.create({
  fields: fieldsRule(),
  lockVersion,
})
