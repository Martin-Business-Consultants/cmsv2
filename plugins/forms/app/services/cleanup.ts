import { rm } from 'node:fs/promises'
import { DateTime } from 'luxon'
import logger from '@adonisjs/core/services/logger'
import type FormSubmission from '../models/form_submission.js'
import FormSubmissionModel from '../models/form_submission.js'
import { storedFilePath } from './forms.js'
import { getFormsSettings } from './settings.js'

export async function removeSubmissionFiles(submissions: FormSubmission[]) {
  for (const submission of submissions) {
    for (const value of Object.values(submission.data ?? {})) {
      if (!value || typeof value !== 'object' || !('key' in value)) continue
      const path = storedFilePath(value.key)
      if (path) await rm(path, { force: true }).catch(() => {})
    }
  }
}

export async function purgeOldSpam() {
  const { spamRetentionDays } = await getFormsSettings()
  if (!spamRetentionDays) return 0
  const cutoff = DateTime.now().minus({ days: spamRetentionDays }).toSQL({ includeOffset: false })
  const old = await FormSubmissionModel.query()
    .where('status', 'spam')
    .where('created_at', '<', cutoff!)
  await removeSubmissionFiles(old)
  await FormSubmissionModel.query()
    .whereIn(
      'id',
      old.map((submission) => submission.id)
    )
    .delete()
  if (old.length) logger.info({ count: old.length }, 'Purged old spam submissions')
  return old.length
}
