import vine from '@vinejs/vine'

export const localeRule = () =>
  vine
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z]{2,3}([-_][a-z0-9]{2,8})*$/)
    .maxLength(20)

const termRule = () =>
  vine.object({
    id: vine.number().withoutDecimals().nullable().optional(),
    title: vine.string().trim().minLength(1).maxLength(200),
  })

export const taxonomyRules = () => ({
  locale: localeRule().optional(),
  category: termRule().nullable().optional(),
  tags: vine.array(termRule()).maxLength(100).optional(),
})

export const translationValidator = vine.create({
  locale: localeRule(),
})

export const languagesValidator = vine.create({
  locales: vine.array(localeRule()).maxLength(50),
})

export const taxonomyPoolsValidator = vine.create({
  categoriesCollection: vine.string().trim().maxLength(60).nullable().optional(),
  tagsCollection: vine.string().trim().maxLength(60).nullable().optional(),
})
