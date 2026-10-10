import vine, { SimpleMessagesProvider } from '@vinejs/vine'

export const profileValidator = vine.create({
  fullName: vine.string().trim().minLength(1).maxLength(100),
})

export const emailValidator = vine.create({
  email: vine
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
        db.whereNot('id', field.meta.userId)
      },
    }),
  currentPassword: vine.string(),
})

export const passwordValidator = vine.create({
  currentPassword: vine.string(),
  password: vine.string().minLength(8).maxLength(128).confirmed({ as: 'passwordConfirmation' }),
})

export const confirmPasswordValidator = vine.create({
  currentPassword: vine.string(),
})

export const totpCodeValidator = vine.create({
  code: vine.string().trim().minLength(1).maxLength(16),
})

const messages = new SimpleMessagesProvider({
  'required': 'This field is required',
  'email': 'Enter a valid email address',
  'minLength': 'Must be at least {{ min }} characters',
  'maxLength': 'Must be at most {{ max }} characters',
  'email.database.unique': 'Another user already has this email',
  'currentPassword.required': 'Enter your current password',
  'code.required': 'Enter the 6-digit code from the app',
  'password.minLength': 'Use at least 8 characters',
  'password.confirmed': "The passwords don't match",
})

for (const validator of [
  profileValidator,
  emailValidator,
  passwordValidator,
  confirmPasswordValidator,
  totpCodeValidator,
]) {
  validator.messagesProvider = messages
}
