import { BaseMail } from '@adonisjs/mail'

export type FormEmailContent = {
  from: { address: string; name: string }
  to: string[]
  replyTo: string | null
  subject: string
  html: Record<string, unknown>
  text: string
}

export default class FormEmailMessage extends BaseMail {
  constructor(private content: FormEmailContent) {
    super()
  }

  prepare() {
    const { from, to, replyTo, subject, html, text } = this.content
    this.message.from(from.address, from.name).subject(subject)
    for (const address of to) this.message.to(address)
    if (replyTo) this.message.replyTo(replyTo)
    this.message.htmlView('forms::emails/form_submission', html)
    this.message.textView('forms::emails/form_submission_text', { text })
  }
}
