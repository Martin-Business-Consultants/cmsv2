import vine from '@vinejs/vine'

const folderName = () =>
  vine
    .string()
    .trim()
    .minLength(1)
    .maxLength(80)
    .regex(/^[^/\\]+$/)
    .notIn(['.', '..'])

const folderPath = () => vine.string().trim().maxLength(500)

export const assetValidator = vine.create({
  title: vine.string().trim().maxLength(200).nullable().optional(),
  alt: vine.string().trim().maxLength(500).nullable().optional(),
  caption: vine.string().trim().maxLength(1000).nullable().optional(),
  description: vine.string().trim().maxLength(5000).nullable().optional(),
  focalX: vine.number().min(0).max(1).optional(),
  focalY: vine.number().min(0).max(1).optional(),
  folder: folderPath().optional(),
})

export const bulkValidator = vine.create({
  ids: vine.array(vine.number().positive().withoutDecimals()).minLength(1).maxLength(500),
  action: vine.enum(['move', 'trash']),
  folder: folderPath().optional().requiredWhen('action', '=', 'move'),
})

export const folderValidator = vine.create({
  parent: folderPath().optional(),
  name: folderName(),
})

export const folderUpdateValidator = vine.create({
  path: folderPath(),
  parent: folderPath(),
  name: folderName(),
})

export const folderDeleteValidator = vine.create({
  path: folderPath(),
})
