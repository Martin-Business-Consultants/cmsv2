import vine from '@vinejs/vine'
import { blocksRule, fieldsRule, seoRule, slugRule, workflowRules } from '#validators/content'
import { taxonomyRules } from '#validators/taxonomy'

export const pageValidator = vine.create({
  title: vine.string().trim().minLength(1).maxLength(200),
  slug: slugRule(),
  parentId: vine.number().nullable().optional(),
  blocks: blocksRule(),
  frontmatter: vine.object({}).allowUnknownProperties().optional(),
  seo: seoRule(),
  ...workflowRules(),
  ...taxonomyRules(),
})

export const pageFieldsValidator = vine.create({
  fields: fieldsRule(),
})
