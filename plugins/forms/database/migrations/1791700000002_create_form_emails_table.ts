import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'form_emails'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.integer('form_id').unsigned().notNullable().references('forms.id').onDelete('CASCADE')
      table.string('kind').notNullable()
      table.boolean('enabled').notNullable().defaultTo(false)
      table.string('recipients').nullable()
      table.string('from_field').nullable()
      table.string('subject').notNullable().defaultTo('')
      table.text('body').notNullable().defaultTo('')
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
      table.unique(['form_id', 'kind'])
    })

    this.defer(async (db) => {
      const forms = await db.from('forms').select('id', 'title', 'notify_emails')
      const now = new Date()
      for (const form of forms) {
        const recipients = String(form.notify_emails ?? '').trim()
        await db.table(this.tableName).insert([
          {
            form_id: form.id,
            kind: 'notification',
            enabled: recipients.length > 0,
            recipients: recipients || null,
            subject: `[${form.title}] New submission #{{submission_id}}`,
            body: 'A new submission has arrived for **{{form_title}}**.\n\n{{answers}}',
            created_at: now,
            updated_at: now,
          },
          {
            form_id: form.id,
            kind: 'confirmation',
            enabled: false,
            subject: 'Thanks for your message',
            body: 'Hi {{name}},\n\nThanks for reaching out. We will get back to you soon.\n\n{{answers}}',
            created_at: now,
            updated_at: now,
          },
        ])
      }
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
