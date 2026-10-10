import env from '#start/env'
import { defineConfig, transports } from '@adonisjs/mail'

const username = env.get('SMTP_USERNAME')
const password = env.get('SMTP_PASSWORD')

const mailConfig = defineConfig({
  default: env.get('MAIL_MAILER'),
  from: {
    address: env.get('MAIL_FROM_ADDRESS'),
    name: env.get('MAIL_FROM_NAME'),
  },
  mailers: {
    smtp: transports.smtp({
      host: env.get('SMTP_HOST'),
      port: env.get('SMTP_PORT'),
      auth: username && password ? { type: 'login', user: username, pass: password } : undefined,
    }),
  },
})

export default mailConfig

declare module '@adonisjs/mail/types' {
  export interface MailersList extends InferMailers<typeof mailConfig> {}
}
