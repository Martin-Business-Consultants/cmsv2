import vine from '@vinejs/vine'
import { fieldsRule } from '#validators/content'

export const collectionValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(100),
  singularName: vine.string().trim().minLength(1).maxLength(100),
  slug: vine
    .string()
    .trim()
    .regex(/^[a-z][a-z0-9_-]*$/)
    .maxLength(60),
  description: vine.string().trim().maxLength(255).nullable().optional(),
  icon: vine
    .string()
    .trim()
    .regex(/^[a-z0-9-]+$/)
    .maxLength(60)
    .nullable()
    .optional(),
  urlPrefix: vine
    .string()
    .trim()
    .regex(/^[a-z0-9][a-z0-9-]*(\/[a-z0-9][a-z0-9-]*)*$/)
    .maxLength(120)
    .nullable()
    .optional(),
  fields: fieldsRule(),
  enableBlocks: vine.boolean().optional(),
  enableBody: vine.boolean().optional(),
  categoriesCollection: vine.string().trim().maxLength(60).nullable().optional(),
  tagsCollection: vine.string().trim().maxLength(60).nullable().optional(),
  buildConfig: vine.object({}).allowUnknownProperties().nullable().optional(),
  notificationEvents: vine.array(vine.string().trim()).optional(),
  notificationEmails: vine.string().trim().maxLength(5000).nullable().optional(),
})
