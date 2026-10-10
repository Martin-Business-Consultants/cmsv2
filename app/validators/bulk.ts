import vine from '@vinejs/vine'

export const bulkValidator = vine.create({
  action: vine.string().trim().maxLength(40),
  ids: vine
    .array(vine.number().positive().withoutDecimals())
    .minLength(1)
    .maxLength(500)
    .distinct(),
})

export const trashBulkValidator = vine.create({
  action: vine.string().trim().maxLength(40),
  ids: vine
    .array(
      vine
        .string()
        .trim()
        .regex(/^[a-z0-9_-]+:\d+$/)
    )
    .minLength(1)
    .maxLength(500)
    .distinct(),
})
