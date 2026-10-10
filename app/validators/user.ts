import vine, { SimpleMessagesProvider } from '@vinejs/vine'

export const loginValidator = vine.create({
  email: vine.string().email().maxLength(254),
  password: vine.string(),
})

const fullName = () => vine.string().trim().minLength(1).maxLength(100)

const email = () =>
  vine
    .string()
    .trim()
    .toLowerCase()
    .email()
    .maxLength(254)
    .unique({
      table: 'users',
      column: 'email',
      caseInsensitive: true,
      filter: (db, _value, field) => {
        if (field.meta.userId) db.whereNot('id', field.meta.userId)
      },
    })

const password = () =>
  vine.string().minLength(8).maxLength(128).confirmed({ as: 'passwordConfirmation' })

const roleId = () => vine.number().exists({ table: 'roles', column: 'id' }).nullable()

const verified = () => vine.boolean().optional()

export const createUserValidator = vine.create({
  fullName: fullName(),
  email: email(),
  roleId: roleId(),
  verified: verified(),
  password: password(),
})

export const updateUserValidator = vine.create({
  fullName: fullName(),
  email: email(),
  roleId: roleId(),
  verified: verified(),
  password: password().nullable().optional(),
})

const messages = new SimpleMessagesProvider({
  'required': 'This field is required',
  'email': 'Enter a valid email address',
  'minLength': 'Must be at least {{ min }} characters',
  'maxLength': 'Must be at most {{ max }} characters',
  'roleId.required': 'Choose a role',
  'roleId.database.exists': 'Choose a role',
  'email.database.unique': 'Another user already has this email',
  'password.minLength': 'Use at least 8 characters',
  'password.confirmed': "The passwords don't match",
})

createUserValidator.messagesProvider = messages
updateUserValidator.messagesProvider = messages
