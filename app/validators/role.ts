import vine, { SimpleMessagesProvider } from '@vinejs/vine'
import { plugins } from '#services/plugins'

export const roleValidator = vine.create({
  name: vine
    .string()
    .trim()
    .minLength(1)
    .maxLength(60)
    .unique({
      table: 'roles',
      column: 'name',
      caseInsensitive: true,
      filter: (db, _value, field) => {
        if (field.meta.roleId) db.whereNot('id', field.meta.roleId)
      },
    }),
  description: vine.string().trim().maxLength(255).nullable().optional(),
  permissions: vine.array(vine.enum(() => plugins.allCapabilities())).distinct(),
})

const messages = new SimpleMessagesProvider({
  'required': 'This field is required',
  'email': 'Enter a valid email address',
  'minLength': 'Must be at least {{ min }} characters',
  'maxLength': 'Must be at most {{ max }} characters',
  'name.required': 'Give the role a name',
  'name.database.unique': 'Another role already has this name',
})

roleValidator.messagesProvider = messages
