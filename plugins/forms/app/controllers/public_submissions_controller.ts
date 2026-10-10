import type { HttpContext } from '@adonisjs/core/http'
import type { MultipartFile } from '@adonisjs/core/bodyparser'
import logger from '@adonisjs/core/services/logger'
import { audit } from '#services/audit'
import Form from '../models/form.js'
import FormSubmission from '../models/form_submission.js'
import {
  MAX_FILE_SIZE,
  extensionsOf,
  storeFiles,
  throwFieldErrors,
  validateSubmission,
  verifyCaptcha,
} from '../services/forms.js'
import { getFormsSettings, publicCaptcha } from '../services/settings.js'
import { enabledEmailKinds } from '../services/emails.js'
import SendFormEmailJob from '../jobs/send_form_email_job.js'
import PostFormWebhookJob from '../jobs/post_form_webhook_job.js'
import { HONEYPOT_FIELD, type SubmissionMeta } from '../types.js'

function safeUrl(value: unknown) {
  if (typeof value !== 'string' || !value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href.slice(0, 500) : null
  } catch {
    return null
  }
}

async function queueFollowUps(form: Form, submission: FormSubmission) {
  try {
    for (const kind of await enabledEmailKinds(form.id)) {
      await SendFormEmailJob.dispatch({ submissionId: submission.id, kind })
    }
    if (form.webhookUrl) await PostFormWebhookJob.dispatch({ submissionId: submission.id })
  } catch (error) {
    logger.error(
      { err: error, form: form.slug, submission: submission.id },
      'Could not queue form follow-ups'
    )
  }
}

export default class PublicSubmissionsController {
  async store(ctx: HttpContext) {
    const { request, response, params, session } = ctx
    const form = await Form.query()
      .where('slug', params.slug)
      .where('status', 'published')
      .whereNull('deleted_at')
      .first()
    if (!form)
      return response.notFound({ ok: false, message: 'This form is not accepting submissions' })

    const input = request.all()
    const wantsJson = !request.header('x-inertia') && request.accepts(['html', 'json']) === 'json'
    const message = form.successMessage || 'Thanks, your message has been sent.'
    const meta: SubmissionMeta = {
      pageUrl: safeUrl(input.page_url) ?? safeUrl(request.header('referer')),
    }
    const base = {
      formId: form.id,
      ip: request.ip(),
      userAgent: request.header('user-agent')?.slice(0, 250) ?? null,
    }

    const respond = () => {
      if (wantsJson) return response.json({ ok: true, message, redirect: form.submitUrl })
      if (form.submitUrl) {
        if (request.header('x-inertia')) return ctx.inertia.location(form.submitUrl)
        return response.redirect(form.submitUrl)
      }
      session.flash('formSuccess', { form: form.slug, message })
      return response.redirect().back()
    }

    if (String(input[HONEYPOT_FIELD] ?? '').trim()) {
      await FormSubmission.create({
        ...base,
        status: 'spam',
        data: {},
        meta: { ...meta, reason: 'honeypot' },
      })
      logger.info({ form: form.slug }, 'Form honeypot triggered, stored as spam')
      return respond()
    }

    const files: Record<string, MultipartFile | null> = {}
    for (const field of form.fields.filter((item) => item.type === 'file')) {
      const extnames = extensionsOf(field.accept)
      files[field.name] = request.file(field.name, {
        size: MAX_FILE_SIZE,
        ...(extnames.length ? { extnames } : {}),
      })
    }

    const { errors, data } = validateSubmission(form.fields, input, files)
    if (errors.length) throwFieldErrors(errors)

    const settings = await getFormsSettings()
    if (!(await verifyCaptcha(settings, input, request.ip()))) {
      throwFieldErrors([
        {
          field: publicCaptcha(settings)!.field,
          message: 'Please complete the security check',
          rule: 'captcha',
        },
      ])
    }

    await storeFiles(form, form.fields, files, data)
    const submission = await FormSubmission.create({ ...base, status: 'new', data, meta })
    await audit(ctx, 'submission.created', submission, { formId: form.id, form: form.slug })
    await queueFollowUps(form, submission)

    return respond()
  }
}
