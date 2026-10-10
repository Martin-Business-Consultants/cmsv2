import vine from '@vinejs/vine'
import { blocksRule, seoRule, slugRule, workflowRules } from '#validators/content'
import { taxonomyRules } from '#validators/taxonomy'

export const entryValidator = vine.create({
  title: vine.string().trim().minLength(1).maxLength(200),
  slug: slugRule(),
  data: vine.object({}).allowUnknownProperties(),
  body: vine.object({}).allowUnknownProperties().nullable().optional(),
  blocks: blocksRule().optional(),
  seo: seoRule(),
  ...workflowRules(),
  ...taxonomyRules(),
})
