import vine, { SimpleMessagesProvider } from '@vinejs/vine'

export const webhookValidator = vine.create({
  name: vine.string().trim().maxLength(255),
  url: vine.string().trim().maxLength(2000),
  active: vine.boolean(),
  events: vine.array(vine.string().trim().maxLength(100)).maxLength(200),
  headersText: vine.string().maxLength(10_000).nullable().optional(),
  eventFilters: vine.any().optional(),
  secret: vine.string().trim().minLength(16).maxLength(500).nullable().optional(),
})

webhookValidator.messagesProvider = new SimpleMessagesProvider({
  'required': 'This field is required',
  'name.required': 'Give the webhook a name',
  'url.required': 'Enter the URL to POST to',
  'secret.minLength': 'A secret needs at least 16 characters',
})
