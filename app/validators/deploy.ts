import vine, { SimpleMessagesProvider } from '@vinejs/vine'

export const deploySettingsValidator = vine.create({
  provider: vine.string().trim().maxLength(100),
  url: vine.string().trim().maxLength(2000).nullable().optional(),
  paused: vine.boolean().optional(),
  githubRepo: vine
    .string()
    .trim()
    .maxLength(200)
    .regex(/^[\w.-]+\/[\w.-]+$/)
    .nullable()
    .optional(),
  githubToken: vine.string().trim().maxLength(500).nullable().optional(),
})

deploySettingsValidator.messagesProvider = new SimpleMessagesProvider({
  'githubRepo.regex': 'Use the form owner/name',
})
