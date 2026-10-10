import vine, { SimpleMessagesProvider } from '@vinejs/vine'

const newPassword = () =>
  vine.string().minLength(8).maxLength(128).confirmed({ as: 'passwordConfirmation' })

export const challengeValidator = vine.create({
  code: vine.string().trim().minLength(1).maxLength(64),
})

export const signupValidator = vine.create({
  siteName: vine.string().trim().maxLength(100).optional(),
  fullName: vine.string().trim().minLength(1).maxLength(100),
  email: vine.string().trim().toLowerCase().email().maxLength(254),
  password: newPassword(),
})

export const passwordResetRequestValidator = vine.create({
  email: vine.string().trim().toLowerCase().email().maxLength(254),
})

export const passwordResetValidator = vine.create({
  password: newPassword(),
})

const messages = new SimpleMessagesProvider({
  'required': 'This field is required',
  'email': 'Enter a valid email address',
  'minLength': 'Must be at least {{ min }} characters',
  'maxLength': 'Must be at most {{ max }} characters',
  'code.required': 'Enter the code from your authenticator app',
  'password.minLength': 'Use at least 8 characters',
  'password.confirmed': "The passwords don't match",
})

for (const validator of [
  challengeValidator,
  signupValidator,
  passwordResetRequestValidator,
  passwordResetValidator,
]) {
  validator.messagesProvider = messages
}
