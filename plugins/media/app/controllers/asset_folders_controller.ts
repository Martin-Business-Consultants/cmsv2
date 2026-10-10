import type { HttpContext } from '@adonisjs/core/http'
import AssetFolder from '../models/asset_folder.js'
import {
  folderDeleteValidator,
  folderUpdateValidator,
  folderValidator,
} from '../validators/asset.js'
import { ROOT, createFolder, joinFolder, moveFolder, removeFolder } from '../services/folders.js'
import { audit } from '#services/audit'

async function auditFolder(ctx: HttpContext, action: string, path: string, metadata = {}) {
  const folder = await AssetFolder.findBy('path', path)
  await audit(ctx, action, folder, { path, ...metadata })
}

export default class AssetFoldersController {
  async store(ctx: HttpContext) {
    const { request, response, bouncer, session } = ctx
    await bouncer.authorize('access', 'assets:write')
    const values = await request.validateUsing(folderValidator)
    const path = await createFolder(values.parent ?? ROOT, values.name)
    await auditFolder(ctx, 'asset_folder.created', path)

    session.flash('success', 'Folder created')
    return response.redirect().toRoute('admin.media.index', {}, { qs: { folder: path } })
  }

  async update(ctx: HttpContext) {
    const { request, response, bouncer, session } = ctx
    await bouncer.authorize('access', 'assets:write')
    const values = await request.validateUsing(folderUpdateValidator)
    const path = await moveFolder(values.path, joinFolder(values.parent, values.name))
    await auditFolder(ctx, 'asset_folder.updated', path, { from: values.path })

    session.flash('success', 'Folder saved')
    return response.redirect().toRoute('admin.media.index', {}, { qs: { folder: path } })
  }

  async destroy(ctx: HttpContext) {
    const { request, response, bouncer, session } = ctx
    await bouncer.authorize('access', 'assets:delete')
    const values = await request.validateUsing(folderDeleteValidator)
    const parent = await removeFolder(values.path)
    await audit(ctx, 'asset_folder.deleted', null, { path: values.path, movedTo: parent })

    session.flash('success', 'Folder deleted; its files moved up a level')
    return response.redirect().toRoute('admin.media.index', {}, { qs: { folder: parent } })
  }
}
