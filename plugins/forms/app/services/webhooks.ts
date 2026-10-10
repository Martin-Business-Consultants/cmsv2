import { absoluteUrl } from '#services/delivery'
import { safeFetch } from '#services/outbound_url'
import FormSubmission from '../models/form_submission.js'
import { recordSubmissionMeta } from './emails.js'

function publicData(submission: FormSubmission) {
  return Object.fromEntries(
    Object.entries(submission.data ?? {}).map(([name, value]) => {
      if (!value || typeof value !== 'object' || !('key' in value)) return [name, value]
      return [
        name,
        {
          name: value.name,
          size: value.size,
          type: value.type,
          url: absoluteUrl(`/admin/submissions/${submission.id}/files/${name}`),
        },
      ]
    })
  )
}

export function webhookPayload(submission: FormSubmission) {
  const form = submission.form
  return {
    event: 'submission.created',
    form: { id: form.id, slug: form.slug, title: form.title },
    submission: {
      id: submission.id,
      data: publicData(submission),
      pageUrl: submission.meta?.pageUrl ?? null,
      createdAt: submission.createdAt.toISO(),
      url: absoluteUrl(`/admin/submissions/${submission.id}`),
    },
  }
}

export async function recordWebhook(submissionId: number, status: number | null) {
  await recordSubmissionMeta(submissionId, (meta) => ({
    ...meta,
    webhook: { status, at: new Date().toISOString() },
  }))
}

export async function postSubmissionWebhook(submissionId: number) {
  const submission = await FormSubmission.query()
    .where('id', submissionId)
    .preload('form')
    .firstOrFail()
  const url = submission.form.webhookUrl
  if (!url) return null
  const response = await safeFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'LibrePublish-Forms' },
    body: JSON.stringify(webhookPayload(submission)),
  })
  await recordWebhook(submission.id, response.status)
  if (!response.ok) throw new Error(`Form webhook answered ${response.status}`)
  return response.status
}
