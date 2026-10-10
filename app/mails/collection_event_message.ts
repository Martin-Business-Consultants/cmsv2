import { BaseMail } from '@adonisjs/mail'

export type CollectionEventContent = {
  from: { name: string; address: string }
  to: string[]
  subject: string
  collectionName: string
  verb: string
  event: string
  title: string
  slug: string
  status: string
  logoUrl: string | null
  entryUrl: string | null
}

export default class CollectionEventMessage extends BaseMail {
  constructor(private content: CollectionEventContent) {
    super()
  }

  prepare() {
    this.message
      .from(this.content.from.address, this.content.from.name)
      .subject(this.content.subject)
    for (const address of this.content.to) this.message.to(address)
    this.message.htmlView('emails/collection_event', this.content)
    this.message.textView('emails/collection_event_text', this.content)
  }
}
