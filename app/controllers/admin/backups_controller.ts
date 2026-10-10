import { createReadStream } from 'node:fs'
import { unlink } from 'node:fs/promises'
import type { HttpContext } from '@adonisjs/core/http'
import {
  backupCommand,
  backupContents,
  backupDir,
  backupStatus,
  exportSiteBackup,
  findArchive,
  keep,
  listArchives,
  nightlyEnabled,
  siteBackupFilename,
} from '#services/backups'
import { audit } from '#services/audit'

export async function sendSiteBackup(ctx: HttpContext) {
  const { response } = ctx
  const filename = siteBackupFilename()
  const backup = await exportSiteBackup()
  await audit(ctx, 'site_backup.exported', null, { bytes: backup.bytes })
  const stream = createReadStream(backup.path)
  const cleanup = () => unlink(backup.path).catch(() => {})
  stream.once('close', cleanup)
  response.header('Content-Type', 'application/gzip')
  response.header('Content-Length', String(backup.bytes))
  response.header('Content-Disposition', `attachment; filename="${filename}"`)
  response.header('Cache-Control', 'no-store')
  response.stream(stream)
}

export default class BackupsController {
  async show({ inertia, bouncer }: HttpContext) {
    await bouncer.authorize('access', 'tools:use')
    const archives = await listArchives()
    return inertia.render('admin/tools/backup', {
      contents: await backupContents(),
      archives: archives.map(({ name, bytes, takenAt }) => ({ name, bytes, takenAt })),
      nightly: {
        enabled: nightlyEnabled(),
        offsite: Boolean(backupCommand()),
        keep: keep(),
        directory: backupDir(),
        status: await backupStatus(),
      },
    })
  }

  async store(ctx: HttpContext) {
    await ctx.bouncer.authorize('access', 'tools:use')
    return sendSiteBackup(ctx)
  }

  async archive(ctx: HttpContext) {
    const { params, response, bouncer } = ctx
    await bouncer.authorize('access', 'tools:use')
    const archive = await findArchive(String(params.name))
    if (!archive) return response.notFound('No such backup')
    await audit(ctx, 'data_backup.downloaded', null, { archive: archive.name, bytes: archive.bytes })
    response.header('Content-Type', 'application/gzip')
    response.header('Cache-Control', 'no-store')
    return response.attachment(archive.path, archive.name)
  }
}
