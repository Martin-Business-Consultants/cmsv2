import type { HttpContext } from '@adonisjs/core/http'
import { audit } from '#services/audit'
import Form from '../models/form.js'
import FormSubmission from '../models/form_submission.js'
import { bulkSubmissionsValidator, submissionStatusValidator } from '../validators/form.js'
import {
  displayValue,
  serializeFormDetail,
  serializeSubmission,
  storedFilePath,
  toCsv,
} from '../services/forms.js'
import { removeSubmissionFiles } from '../services/cleanup.js'
import type { StoredFile } from '../types.js'

const PER_PAGE = 25

type Filters = { form: number | null; status: string; search: string; page: number }

function filtersFrom(qs: Record<string, any>, formId?: number): Filters {
  const status = ['new', 'spam', 'all'].includes(qs.status) ? qs.status : ''
  return {
    form: formId ?? (Number(qs.form) || null),
    status,
    search: String(qs.search ?? '').slice(0, 100),
    page: Math.max(1, Number(qs.page) || 1),
  }
}

export default class SubmissionsController {
  async index(ctx: HttpContext) {
    return this.#render(ctx, filtersFrom(ctx.request.qs()))
  }

  async forForm(ctx: HttpContext) {
    return this.#render(ctx, filtersFrom(ctx.request.qs(), Number(ctx.params.formId)))
  }

  async show(ctx: HttpContext) {
    await ctx.bouncer.authorize('access', 'submissions:read')
    const submission = await FormSubmission.findOrFail(ctx.params.id)
    return this.#render(
      ctx,
      {
        form: submission.formId,
        status: submission.status === 'spam' ? 'spam' : 'all',
        search: '',
        page: 1,
      },
      submission
    )
  }

  async #render({ inertia, bouncer }: HttpContext, filters: Filters, open?: FormSubmission) {
    await bouncer.authorize('access', 'submissions:read')
    const form = filters.form ? await Form.find(filters.form) : null
    const query = FormSubmission.query()
      .preload('form')
      .orderBy('created_at', 'desc')
      .orderBy('id', 'desc')
    if (form) query.where('form_id', form.id)
    if (filters.status === 'new') query.where('status', 'new')
    else if (filters.status === 'spam') query.where('status', 'spam')
    else if (filters.status !== 'all') query.whereNot('status', 'spam')
    if (filters.search) query.whereLike('data', `%${filters.search}%`)
    const page = await query.paginate(filters.page, PER_PAGE)
    const meta = page.getMeta()

    const counts = FormSubmission.query().select('status').count('* as total').groupBy('status')
    if (form) counts.where('form_id', form.id)
    const rows = await counts
    const totals = Object.fromEntries(rows.map((row) => [row.status, Number(row.$extras.total)]))
    const forms = await Form.query().whereNull('deleted_at').orderBy('title')

    return inertia.render('forms/admin/submissions', {
      form: form ? await serializeFormDetail(form) : null,
      forms: forms.map((item) => ({
        id: item.id,
        title: item.title,
        slug: item.slug,
        status: item.status,
      })),
      submissions: page.all().map(serializeSubmission),
      open: open ? (await open.load('form'), serializeSubmission(open)) : null,
      counts: {
        inbox: (totals.new ?? 0) + (totals.read ?? 0),
        unread: totals.new ?? 0,
        spam: totals.spam ?? 0,
      },
      filters: {
        form: form?.id ?? null,
        status: filters.status,
        search: filters.search,
      },
      meta: {
        total: Number(meta.total),
        perPage: Number(meta.perPage),
        currentPage: Number(meta.currentPage),
        lastPage: Number(meta.lastPage),
      },
    })
  }

  async update(ctx: HttpContext) {
    const { request, response, params, bouncer, session } = ctx
    await bouncer.authorize('access', 'submissions:read')
    const { status } = await request.validateUsing(submissionStatusValidator)
    if (status === 'spam') await bouncer.authorize('access', 'submissions:delete')
    const submission = await FormSubmission.findOrFail(params.id)
    const was = submission.status
    submission.status = status
    await submission.save()
    if (was !== status) {
      await audit(ctx, `submission.marked_${status}`, submission, { formId: submission.formId })
      if (status === 'spam') session.flash('success', 'Marked as spam')
      if (was === 'spam') session.flash('success', 'Moved back to the inbox')
    }
    return response.redirect().back()
  }

  async destroy(ctx: HttpContext) {
    const { params, response, bouncer, session } = ctx
    await bouncer.authorize('access', 'submissions:delete')
    const submission = await FormSubmission.findOrFail(params.id)
    await removeSubmissionFiles([submission])
    await submission.delete()
    await audit(ctx, 'submission.deleted', submission, { formId: submission.formId })

    session.flash('success', 'Submission deleted')
    const referer = ctx.request.header('referer') ?? ''
    if (new RegExp(`/admin/submissions/${submission.id}(\\?|$)`).test(referer)) {
      return response.redirect().toPath(`/admin/forms/${submission.formId}/submissions`)
    }
    return response.redirect().back()
  }

  async bulk(ctx: HttpContext) {
    const { request, response, bouncer, session } = ctx
    const { ids, action } = await request.validateUsing(bulkSubmissionsValidator)
    await bouncer.authorize(
      'access',
      action === 'delete' || action === 'spam' ? 'submissions:delete' : 'submissions:read'
    )
    const submissions = await FormSubmission.query().whereIn('id', ids)
    if (action === 'delete') {
      await removeSubmissionFiles(submissions)
      await FormSubmission.query().whereIn('id', ids).delete()
    } else {
      await FormSubmission.query().whereIn('id', ids).update({ status: action })
    }
    await audit(
      ctx,
      action === 'delete' ? 'submission.bulk_deleted' : `submission.bulk_marked_${action}`,
      null,
      {
        ids: submissions.map((submission) => submission.id),
        count: submissions.length,
      }
    )

    const noun = submissions.length === 1 ? 'submission' : 'submissions'
    const verbs = {
      delete: 'deleted',
      read: 'marked as read',
      new: 'marked as unread',
      spam: 'marked as spam',
    }
    session.flash('success', `${submissions.length} ${noun} ${verbs[action]}`)
    return response.redirect().back()
  }

  async export(ctx: HttpContext) {
    const { params, response, bouncer, request } = ctx
    await bouncer.authorize('access', 'submissions:read')
    const form = await Form.findOrFail(params.formId)
    const query = FormSubmission.query()
      .where('form_id', form.id)
      .orderBy('created_at', 'desc')
      .orderBy('id', 'desc')
    if (request.qs().status === 'spam') query.where('status', 'spam')
    else query.whereNot('status', 'spam')
    const submissions = await query

    const rows = [
      [
        'ID',
        'Submitted at',
        'Status',
        ...form.fields.map((field) => field.label || field.name),
        'Page',
        'IP',
      ],
      ...submissions.map((submission) => [
        submission.id,
        submission.createdAt.toISO(),
        submission.status,
        ...form.fields.map((field) => displayValue(submission.data?.[field.name])),
        submission.meta?.pageUrl ?? '',
        submission.ip,
      ]),
    ]
    await audit(ctx, 'form.submissions_exported', form, { count: submissions.length })

    const filename = `${form.slug}-submissions-${new Date().toISOString().slice(0, 10)}.csv`
    response.header('Content-Type', 'text/csv; charset=utf-8')
    response.header('Content-Disposition', `attachment; filename="${filename}"`)
    return response.send(`${String.fromCharCode(0xfeff)}${toCsv(rows)}\r\n`)
  }

  async file({ params, response, bouncer }: HttpContext) {
    await bouncer.authorize('access', 'submissions:read')
    const submission = await FormSubmission.findOrFail(params.id)
    const value = submission.data?.[params.field] as StoredFile | undefined
    const path = value && typeof value === 'object' ? storedFilePath(value.key) : null
    if (!path) return response.notFound()
    return response.attachment(path, value!.name)
  }
}
