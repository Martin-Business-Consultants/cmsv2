import vine, { SimpleMessagesProvider } from '@vinejs/vine'

export const serviceTokenValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(120),
  description: vine.string().trim().maxLength(500).nullable().optional(),
  roleId: vine.number().exists({ table: 'roles', column: 'id' }),
})

serviceTokenValidator.messagesProvider = new SimpleMessagesProvider({
  'required': 'This field is required',
  'maxLength': 'Must be at most {{ max }} characters',
  'name.required': 'Give it a name',
  'name.minLength': 'Give it a name',
  'roleId.required': 'Pick a role for the token',
  'roleId.number': 'Pick a role for the token',
  'roleId.database.exists': 'Pick a role for the token',
})
