import { fileURLToPath } from 'node:url'
import { DateTime } from 'luxon'
import edge from 'edge.js'
import limiter from '@adonisjs/limiter/services/main'
import { definePlugin } from '#services/plugins'
import Form from './app/models/form.js'
import FormSubmission from './app/models/form_submission.js'
import FormEmail from './app/models/form_email.js'
import {
  createForm,
  emailDefaults,
  resolveForm,
  serializeSubmission,
  summarize,
} from './app/services/forms.js'
import { getFormsSettings, publicCaptcha, recipientList } from './app/services/settings.js'
import { purgeOldSpam, removeSubmissionFiles } from './app/services/cleanup.js'

const FormsController = () => import('./app/controllers/forms_controller.js')
const SubmissionsController = () => import('./app/controllers/submissions_controller.js')
const SettingsController = () => import('./app/controllers/settings_controller.js')
const PublicSubmissionsController = () =>
  import('./app/controllers/public_submissions_controller.js')
const ApiFormsController = () => import('./app/controllers/api_forms_controller.js')

const throttle = limiter.define('form_submissions', (ctx) =>
  limiter.allowRequests(10).every('1 minute').usingKey(`form_${ctx.request.ip()}`)
)

export default definePlugin({
  key: 'forms',
  name: 'Forms',
  version: '1.0.0',
  description:
    'Contact and signup forms with a builder, a submissions inbox, email notifications and confirmations, webhooks and spam protection.',
  author: 'LibrePublish',
  enabledByDefault: true,

  register(cms) {
    edge.mount('forms', fileURLToPath(new URL('./resources/views', import.meta.url)))

    cms.menu({
      id: 'forms',
      label: 'Forms',
      icon: 'clipboard-list',
      group: 'Content',
      after: 'media',
    })
    cms.submenu({
      parent: 'forms',
      label: 'All forms',
      href: '/admin/forms',
      capability: 'forms:read',
    })
    cms.submenu({
      parent: 'forms',
      label: 'Add new',
      href: '/admin/forms/new',
      capability: 'forms:write',
      after: 'All forms',
    })
    cms.submenu({
      parent: 'forms',
      label: 'Submissions',
      href: '/admin/submissions',
      capability: 'submissions:read',
      after: 'Add new',
    })
    cms.newItem({
      label: 'Form',
      href: '/admin/forms/new',
      capability: 'forms:write',
      after: 'Global',
    })

    cms.permissions({
      group: 'Forms',
      capabilities: [
        'forms:read',
        'forms:write',
        'forms:delete',
        'submissions:read',
        'submissions:delete',
      ],
      after: 'Globals',
      defaults: {
        'Editor': [
          'forms:read',
          'forms:write',
          'forms:delete',
          'submissions:read',
          'submissions:delete',
        ],
        'Author': ['forms:read'],
        'Production site': ['forms:read'],
        'Agent': ['forms:read'],
      },
    })

    cms.settingsPage({
      id: 'forms',
      label: 'Forms',
      href: '/admin/settings/forms',
      description: 'Email sender, default recipients and spam protection for forms.',
      capability: 'settings:read',
    })

    cms.blockTypes([
      {
        slug: 'form',
        label: 'Form',
        category: 'Sections',
        description: 'Embeds one of your forms, with an optional heading and intro text.',
        icon: 'clipboard-list',
        fields: [
          { name: 'heading', label: 'Heading', type: 'string' },
          { name: 'body', label: 'Intro text', type: 'text' },
          { name: 'form', label: 'Form', type: 'form', required: true },
        ],
        defaults: { heading: 'Get in touch', body: '' },
      },
    ])

    cms.fieldType({
      type: 'form',
      label: 'Form',
      input: 'form',
      validate: (value) =>
        value === null ||
        value === undefined ||
        value === '' ||
        (Number.isInteger(value) && Number(value) > 0)
          ? null
          : 'must be a form',
      resolve: async (value, _field, { live }) => {
        const id = Number(value)
        if (!id) return null
        const query = Form.query().where('id', id).whereNull('deleted_at')
        if (live) query.where('status', 'published')
        const form = await query.first()
        return form ? resolveForm(form, await getFormsSettings()) : null
      },
      references: (value) =>
        Number.isInteger(value) && Number(value) > 0 ? [{ type: 'form', id: Number(value) }] : [],
      jsonSchema: { type: 'integer', description: 'The id of a form (Forms plugin)' },
    })

    cms.provide('publishedForms', async () => {
      const [row] = await Form.query()
        .where('status', 'published')
        .whereNull('deleted_at')
        .count('* as total')
      return Number(row.$extras.total)
    })
    cms.provide('spamProtection', async () => publicCaptcha(await getFormsSettings()) !== null)
    cms.provide('formsHealth', async () => {
      const settings = await getFormsSettings()
      const forms = await Form.query()
        .where('status', 'published')
        .whereNull('deleted_at')
        .preload('emails')
        .orderBy('title')
      const silent = forms.filter((form) => {
        const notification = form.emails.find((email) => email.kind === 'notification')
        if (!notification?.enabled) return true
        const recipients = recipientList(notification.recipients).length
          ? recipientList(notification.recipients)
          : recipientList(settings.defaultRecipients)
        return recipients.length === 0
      })
      return { silent: silent.map((form) => form.title), sender: settings.fromEmail || null }
    })

    cms.dashboardWidget({
      id: 'submissions',
      title: 'Form submissions',
      component: 'submissions',
      capability: 'submissions:read',
      props: async () => {
        const since = DateTime.now().minus({ days: 7 }).toSQL({ includeOffset: false })
        const [week] = await FormSubmission.query()
          .whereNot('status', 'spam')
          .where('created_at', '>=', since!)
          .count('* as total')
        const [unread] = await FormSubmission.query().where('status', 'new').count('* as total')
        const latest = await FormSubmission.query()
          .whereNot('status', 'spam')
          .preload('form')
          .orderBy('created_at', 'desc')
          .orderBy('id', 'desc')
          .limit(5)
        return {
          count: Number(week.$extras.total),
          unread: Number(unread.$extras.total),
          latest: latest.map((submission) => {
            const row = serializeSubmission(submission)
            return {
              id: row.id,
              formTitle: row.formTitle,
              summary: row.summary || summarize(undefined, row.data),
              status: row.status,
              createdAt: row.createdAt,
            }
          }),
        }
      },
    })

    cms.searchable({
      kind: 'form',
      label: 'Form',
      capability: 'forms:read',
      href: (id) => `/admin/forms/${id}/edit`,
      documents: async () => {
        const forms = await Form.query().whereNull('deleted_at')
        return forms.map((form) => form.searchDocument)
      },
    })

    cms.trashable({
      kind: 'form',
      label: 'Forms',
      list: async () => {
        const forms = await Form.query().whereNotNull('deleted_at').orderBy('deleted_at', 'desc')
        return forms.map((form) => ({
          id: form.id,
          title: form.title,
          detail: `/forms/${form.slug}`,
          deletedAt: form.deletedAt?.toISO() ?? null,
        }))
      },
      restore: async (id) => {
        const form = await Form.query().where('id', id).whereNotNull('deleted_at').firstOrFail()
        form.deletedAt = null
        await form.save()
      },
      purge: async (id) => {
        const form = await Form.query().where('id', id).whereNotNull('deleted_at').firstOrFail()
        const submissions = await FormSubmission.query().where('form_id', form.id)
        await removeSubmissionFiles(submissions)
        await FormSubmission.query().where('form_id', form.id).delete()
        await FormEmail.query().where('form_id', form.id).delete()
        await form.delete()
      },
    })

    cms.bootstrap(async () => {
      if (await Form.query().first()) return
      const emails = emailDefaults()
      emails.notification.enabled = true
      emails.notification.fromField = 'email'
      await createForm(
        {
          title: 'Contact us',
          slug: 'contact',
          status: 'published',
          fields: [
            { name: 'name', label: 'Name', type: 'text', required: true },
            { name: 'email', label: 'Email', type: 'email', required: true },
            { name: 'phone', label: 'Phone', type: 'tel' },
            { name: 'message', label: 'Message', type: 'textarea', required: true },
          ],
          submitLabel: 'Send message',
          successMessage: 'Thanks! We will get back to you within one business day.',
        },
        emails
      )
    })

    cms.nightly(async () => {
      await purgeOldSpam()
    })

    cms.routes('admin', (router) => {
      router.get('forms', [FormsController, 'index']).as('forms.index')
      router.get('forms/new', [FormsController, 'create']).as('forms.create')
      router.post('forms', [FormsController, 'store']).as('forms.store')
      router.get('forms/:id/edit', [FormsController, 'edit']).as('forms.edit')
      router.put('forms/:id', [FormsController, 'update']).as('forms.update')
      router.post('forms/:id/duplicate', [FormsController, 'duplicate']).as('forms.duplicate')
      router.delete('forms/:id', [FormsController, 'destroy']).as('forms.destroy')
      router.get('lookups/forms', [FormsController, 'lookup']).as('lookups.forms')

      router
        .get('forms/:formId/submissions', [SubmissionsController, 'forForm'])
        .as('forms.submissions')
      router
        .get('forms/:formId/submissions/export', [SubmissionsController, 'export'])
        .as('forms.submissions.export')
      router.get('submissions', [SubmissionsController, 'index']).as('submissions.index')
      router.post('submissions/bulk', [SubmissionsController, 'bulk']).as('submissions.bulk')
      router.get('submissions/:id', [SubmissionsController, 'show']).as('submissions.show')
      router.put('submissions/:id', [SubmissionsController, 'update']).as('submissions.update')
      router.delete('submissions/:id', [SubmissionsController, 'destroy']).as('submissions.destroy')
      router
        .get('submissions/:id/files/:field', [SubmissionsController, 'file'])
        .as('submissions.file')

      router.get('settings/forms', [SettingsController, 'edit']).as('settings.forms.edit')
      router.put('settings/forms', [SettingsController, 'update']).as('settings.forms.update')
    })

    cms.routes('site', (router) => {
      router
        .post('forms/:slug', [PublicSubmissionsController, 'store'])
        .as('public.forms.submit')
        .use(throttle)
    })

    cms.routes('api', (router) => {
      router.get('forms', [ApiFormsController, 'index']).as('forms.index')
      router.get('forms/:slug', [ApiFormsController, 'show']).as('forms.show')
    })

    cms.api('/api/v1/forms', 'Published forms with their fields, action and spam protection')
    cms.api('/api/v1/forms/:slug', 'One published form')
    cms.api('/forms/:slug', 'Public form submission endpoint (POST)')
    cms.webhookEvents('Forms', ['submission.created'])
  },
})
