import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import { assertValid } from '#services/fields'
import { audit } from '#services/audit'
import { validateOutboundUrl } from '#services/outbound_url'
import Form from '../models/form.js'
import FormEmail from '../models/form_email.js'
import FormSubmission from '../models/form_submission.js'
import { formValidator } from '../validators/form.js'
import {
  cleanFormFields,
  emailDefaults,
  serializeFormDetail,
  serializeSubmission,
  createForm,
  validateFormFields,
} from '../services/forms.js'
import { getFormsSettings, recipientList } from '../services/settings.js'
import { EMAIL_KINDS, type FormOption, type FormSummary } from '../types.js'

type Values = Awaited<ReturnType<typeof formValidator.validate>>

async function slugErrors(slug: string, except?: number) {
  const query = Form.query().where('slug', slug)
  if (except) query.whereNot('id', except)
  const taken = await query.first()
  if (!taken) return []
  return [
    {
      field: 'slug',
      message: taken.deletedAt
        ? 'A form in the trash uses this slug. Restore or delete it first.'
        : 'Another form already uses this slug',
      rule: 'unique',
    },
  ]
}

function emailErrors(values: Values) {
  const names = new Set(values.fields.map((field) => field.name))
  const out = []
  for (const kind of EMAIL_KINDS) {
    const email = values.emails[kind]
    if (email.fromField && !names.has(email.fromField)) {
      out.push({
        field: `emails.${kind}.fromField`,
        message: 'Pick one of the form’s fields',
        rule: 'exists',
      })
    }
    if (email.enabled && !email.subject) {
      out.push({ field: `emails.${kind}.subject`, message: 'Add a subject', rule: 'required' })
    }
  }
  const confirmation = values.emails.confirmation
  if (
    confirmation.enabled &&
    !confirmation.fromField &&
    !values.fields.some((field) => field.type === 'email')
  ) {
    out.push({
      field: 'emails.confirmation.fromField',
      message: 'Add an email field so the confirmation has somewhere to go',
      rule: 'required',
    })
  }
  return out
}

async function webhookErrors(values: Values) {
  if (!values.webhookUrl) return []
  const message = await validateOutboundUrl(values.webhookUrl)
  return message ? [{ field: 'webhookUrl', message, rule: 'outboundUrl' }] : []
}

function attributes(values: Values) {
  return {
    title: values.title,
    slug: values.slug,
    status: values.status,
    fields: cleanFormFields(values.fields),
    submitLabel: values.submitLabel || 'Submit',
    successMessage: values.successMessage || 'Thanks, your message has been sent.',
    submitUrl: values.submitUrl || null,
    webhookUrl: values.webhookUrl || null,
  }
}

async function saveEmails(form: Form, values: Values) {
  for (const kind of EMAIL_KINDS) {
    const email = values.emails[kind]
    await FormEmail.updateOrCreate(
      { formId: form.id, kind },
      {
        formId: form.id,
        kind,
        enabled: email.enabled,
        recipients:
          kind === 'notification' ? recipientList(email.recipients).join(', ') || null : null,
        fromField: email.fromField || null,
        subject: email.subject ?? '',
        body: email.body ?? '',
      }
    )
  }
}

export default class FormsController {
  async index({ inertia, bouncer, request }: HttpContext) {
    await bouncer.authorize('access', 'forms:read')
    const { search = '', status = '' } = request.qs()
    const query = Form.query()
      .whereNull('deleted_at')
      .withCount('submissions', (q) => q.whereNot('status', 'spam'))
      .withCount('submissions', (q) => q.where('status', 'new').as('unread_count'))
      .withAggregate('submissions', (q) => q.max('created_at').as('last_submission_at'))
      .orderBy('title')
    if (search) {
      query.where((q) => q.whereLike('title', `%${search}%`).orWhereLike('slug', `%${search}%`))
    }
    if (status === 'draft' || status === 'published') query.where('status', status)
    const forms = await query

    const rows: FormSummary[] = forms.map((form) => {
      const last = form.$extras.last_submission_at
      return {
        id: form.id,
        title: form.title,
        slug: form.slug,
        status: form.status,
        updatedAt: form.updatedAt?.toISO() ?? null,
        submissionsCount: Number(form.$extras.submissions_count ?? 0),
        unreadCount: Number(form.$extras.unread_count ?? 0),
        lastSubmissionAt: last
          ? (last instanceof Date
              ? DateTime.fromJSDate(last)
              : DateTime.fromSQL(String(last), { zone: 'utc' })
            ).toISO()
          : null,
      }
    })

    return inertia.render('forms/admin/index', {
      forms: rows,
      filters: { search: String(search), status: String(status) },
    })
  }

  async create({ inertia, bouncer }: HttpContext) {
    await bouncer.authorize('access', 'forms:write')
    const settings = await getFormsSettings()
    return inertia.render('forms/admin/create', {
      emails: emailDefaults(),
      defaultRecipients: settings.defaultRecipients || null,
    })
  }

  async store(ctx: HttpContext) {
    const { request, response, bouncer, session } = ctx
    await bouncer.authorize('access', 'forms:write')
    const values = await request.validateUsing(formValidator)
    assertValid([
      ...validateFormFields(values.fields),
      ...(await slugErrors(values.slug)),
      ...emailErrors(values),
      ...(await webhookErrors(values)),
    ])

    const form = await Form.create(attributes(values))
    await saveEmails(form, values)
    await audit(ctx, 'form.created', form)

    session.flash('success', 'Form created')
    return response.redirect().toRoute('admin.forms.edit', { id: form.id })
  }

  async edit({ inertia, params, bouncer, auth }: HttpContext) {
    await bouncer.authorize('access', 'forms:read')
    const form = await Form.query().where('id', params.id).whereNull('deleted_at').firstOrFail()
    const counts = await FormSubmission.query()
      .where('form_id', form.id)
      .select('status')
      .count('* as total')
      .groupBy('status')
    const count = (status: string) =>
      Number(counts.find((row) => row.status === status)?.$extras.total ?? 0)
    const canRead = auth.use('web').user!.can('submissions:read')
    const recent = canRead
      ? await FormSubmission.query()
          .where('form_id', form.id)
          .whereNot('status', 'spam')
          .preload('form')
          .orderBy('created_at', 'desc')
          .orderBy('id', 'desc')
          .limit(10)
      : []

    const settings = await getFormsSettings()
    return inertia.render('forms/admin/edit', {
      form: await serializeFormDetail(form),
      counts: { total: count('new') + count('read'), unread: count('new'), spam: count('spam') },
      recent: recent.map(serializeSubmission),
      defaultRecipients: settings.defaultRecipients || null,
    })
  }

  async update(ctx: HttpContext) {
    const { request, response, params, bouncer, session } = ctx
    await bouncer.authorize('access', 'forms:write')
    const form = await Form.query().where('id', params.id).whereNull('deleted_at').firstOrFail()
    const values = await request.validateUsing(formValidator)
    assertValid([
      ...validateFormFields(values.fields),
      ...(await slugErrors(values.slug, form.id)),
      ...emailErrors(values),
      ...(await webhookErrors(values)),
    ])

    const wasStatus = form.status
    form.merge(attributes(values))
    await form.save()
    await saveEmails(form, values)
    await audit(ctx, 'form.updated', form, wasStatus !== form.status ? { status: form.status } : {})
    if (wasStatus !== form.status) {
      await audit(ctx, form.status === 'published' ? 'form.published' : 'form.unpublished', form)
    }

    session.flash('success', 'Form saved')
    return response.redirect().back()
  }

  async duplicate(ctx: HttpContext) {
    const { params, response, bouncer, session } = ctx
    await bouncer.authorize('access', 'forms:write')
    const source = await Form.query().where('id', params.id).whereNull('deleted_at').firstOrFail()
    const detail = await serializeFormDetail(source)
    let slug = `${source.slug}-copy`
    for (let n = 2; await Form.findBy('slug', slug); n++) slug = `${source.slug}-copy-${n}`

    const form = await createForm(
      {
        title: `${source.title} (copy)`,
        slug,
        status: 'draft',
        fields: source.fields,
        submitLabel: source.submitLabel,
        successMessage: source.successMessage,
        submitUrl: source.submitUrl,
        webhookUrl: source.webhookUrl,
      },
      detail.emails
    )
    await audit(ctx, 'form.created', form, { duplicatedFrom: source.id })

    session.flash('success', 'Form duplicated')
    return response.redirect().toRoute('admin.forms.edit', { id: form.id })
  }

  async destroy(ctx: HttpContext) {
    const { params, response, bouncer, session } = ctx
    await bouncer.authorize('access', 'forms:delete')
    const form = await Form.query().where('id', params.id).whereNull('deleted_at').firstOrFail()
    form.deletedAt = DateTime.now()
    await form.save()
    await audit(ctx, 'form.trashed', form)

    session.flash('success', 'Form moved to trash')
    return response.redirect().toRoute('admin.forms.index')
  }

  async lookup({ request }: HttpContext) {
    const { search, ids } = request.qs()
    const query = Form.query().whereNull('deleted_at').orderBy('title').limit(50)
    if (ids) {
      query.whereIn('id', String(ids).split(',').map(Number).filter(Boolean))
    } else if (search) {
      query.where((q) => q.whereLike('title', `%${search}%`).orWhereLike('slug', `%${search}%`))
    }
    const forms = await query
    const data: FormOption[] = forms.map((form) => ({
      id: form.id,
      title: form.title,
      slug: form.slug,
      status: form.status,
    }))
    return { data }
  }
}
