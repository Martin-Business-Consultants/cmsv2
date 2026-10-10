import { BaseMail } from '@adonisjs/mail'

export type IdentityMessageContent = {
  to: string
  subject: string
  siteName: string
  intro: string[]
  introText: string[]
  action: string
  url: string
  outro: string
}

export default class IdentityMessage extends BaseMail {
  constructor(private content: IdentityMessageContent) {
    super()
  }

  prepare() {
    this.message.to(this.content.to).subject(this.content.subject)
    this.message.htmlView('emails/identity', this.content)
    this.message.textView('emails/identity_text', this.content)
  }
}
