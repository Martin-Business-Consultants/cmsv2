import { PassThrough } from 'node:stream'
import type { HttpContext } from '@adonisjs/core/http'
import Asset from '../models/asset.js'
import AssetTransformer from '../transformers/asset_transformer.js'
import { assetValidator, bulkValidator } from '../validators/asset.js'
import { folderTree, normalizeFolder } from '../services/folders.js'
import { assetOption, libraryQuery, parseFilters } from '../services/library.js'
import {
  LIMITS,
  UPLOAD_EXTNAMES,
  importArchive,
  isArchive,
  moveAssets,
  replaceFile,
  storeFile,
  trashAssets,
  updateDetails,
} from '../services/media.js'
import { receiveUpload } from '../services/uploads.js'
import { assetUsage } from '../services/usage.js'
import { audit } from '#services/audit'
import { paginate } from '#services/listing'

const PER_PAGE = 60

function uploadName(ctx: HttpContext) {
  const name = String(ctx.request.qs().filename ?? '').trim()
  return (name.split(/[\\/]/).pop() ?? '').slice(0, 200)
}

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : 'failed'
}

export default class AssetsController {
  async index({ inertia, request, bouncer }: HttpContext) {
    await bouncer.authorize('access', 'assets:read')
    const filters = parseFilters(request.qs())
    const page = Math.max(1, Number(request.qs().page) || 1)
    const { rows, meta } = await paginate(libraryQuery(filters), page, PER_PAGE)
    const selectedId = Number(request.qs().selected) || null
    const selected = selectedId
      ? await Asset.query()
          .apply((scopes) => scopes.active())
          .where('id', selectedId)
          .first()
      : null

    return inertia.render('media/admin/index', {
      assets: AssetTransformer.transform(rows),
      meta,
      filters,
      folders: await folderTree(),
      selected: selected ? AssetTransformer.transform(selected) : null,
      usage: selected ? await assetUsage(selected) : [],
      extnames: UPLOAD_EXTNAMES,
    })
  }

  async create({ inertia, request, bouncer }: HttpContext) {
    await bouncer.authorize('access', 'assets:write')
    return inertia.render('media/admin/create', {
      folder: normalizeFolder(request.qs().folder),
      folders: await folderTree(),
      extnames: UPLOAD_EXTNAMES,
    })
  }

  async store(ctx: HttpContext) {
    const { request, response, bouncer } = ctx
    await bouncer.authorize('access', 'assets:write')
    const name = uploadName(ctx)
    if (!name) return response.unprocessableEntity({ errors: ['Choose a file to upload'] })
    const folder = normalizeFolder(request.qs().folder)
    const unpack = isArchive(name) && request.qs().unzip !== '0'

    const output = new PassThrough()
    const send = (event: Record<string, unknown>) => output.write(`${JSON.stringify(event)}\n`)
    response.header('Content-Type', 'application/x-ndjson; charset=utf-8')
    response.header('Cache-Control', 'no-store')
    response.header('X-Accel-Buffering', 'no')
    response.stream(output)

    const run = async () => {
      const received = await receiveUpload(
        request,
        unpack ? LIMITS.archiveBytes : LIMITS.fileBytes
      ).catch((error) => {
        send({ type: 'done', assets: [], failures: [`${name} ${messageOf(error)}`] })
        return null
      })
      if (!received) return
      try {
        if (unpack) {
          const result = await importArchive(received.path, {
            name,
            folder,
            onProgress: (progress) => send({ type: 'progress', ...progress }),
          })
          for (const asset of result.assets) {
            await audit(ctx, 'asset.uploaded', asset, { folder: asset.folder, archive: name })
          }
          send({
            type: 'done',
            folder: result.folder,
            assets: result.assets.map(assetOption),
            failures: result.failures,
            skipped: result.skipped,
          })
        } else {
          const asset = await storeFile({ buffer: await received.read(), filename: name }, folder)
          await audit(ctx, 'asset.uploaded', asset, {
            folder: asset.folder,
            size: asset.size,
            mimeType: asset.mimeType,
          })
          send({ type: 'done', assets: [assetOption(asset)], failures: [] })
        }
      } catch (error) {
        send({ type: 'done', assets: [], failures: [`${name} ${messageOf(error)}`] })
      } finally {
        await received.discard()
      }
    }
    run().finally(() => output.end())
  }

  async update(ctx: HttpContext) {
    const { request, response, params, bouncer, session } = ctx
    await bouncer.authorize('access', 'assets:write')
    const asset = await Asset.query()
      .apply((scopes) => scopes.active())
      .where('id', params.id)
      .firstOrFail()
    const values = await request.validateUsing(assetValidator)
    const moved = values.folder !== undefined && normalizeFolder(values.folder) !== asset.folder
    await updateDetails(asset, values)
    await audit(ctx, moved ? 'asset.moved' : 'asset.updated', asset, { folder: asset.folder })

    session.flash('success', 'File details saved')
    return response.redirect().back()
  }

  async replace(ctx: HttpContext) {
    const { request, response, params, bouncer } = ctx
    await bouncer.authorize('access', 'assets:write')
    const asset = await Asset.query()
      .apply((scopes) => scopes.active())
      .where('id', params.id)
      .firstOrFail()
    const name = uploadName(ctx)
    if (!name) return response.unprocessableEntity({ errors: ['Choose a file to upload'] })
    try {
      const received = await receiveUpload(request, LIMITS.fileBytes)
      try {
        await replaceFile(asset, { buffer: await received.read(), filename: name })
      } finally {
        await received.discard()
      }
    } catch (error) {
      return response.unprocessableEntity({ errors: [`${name} ${messageOf(error)}`] })
    }
    await audit(ctx, 'asset.replaced', asset, { filename: name, size: asset.size })
    return { data: assetOption(asset) }
  }

  async destroy(ctx: HttpContext) {
    const { params, response, bouncer, session } = ctx
    await bouncer.authorize('access', 'assets:delete')
    const [asset] = await trashAssets([Number(params.id)])
    if (!asset) return response.notFound()
    await audit(ctx, 'asset.trashed', asset)

    session.flash('success', 'File moved to the trash')
    return response.redirect().back()
  }

  async bulk(ctx: HttpContext) {
    const { request, response, bouncer, session } = ctx
    const values = await request.validateUsing(bulkValidator)
    await bouncer.authorize('access', values.action === 'trash' ? 'assets:delete' : 'assets:write')

    if (values.action === 'move') {
      const assets = await moveAssets(values.ids, values.folder ?? '/')
      for (const asset of assets) await audit(ctx, 'asset.moved', asset, { folder: asset.folder })
      session.flash('success', `${assets.length} ${assets.length === 1 ? 'file' : 'files'} moved`)
    } else {
      const assets = await trashAssets(values.ids)
      for (const asset of assets) await audit(ctx, 'asset.trashed', asset)
      session.flash(
        'success',
        `${assets.length} ${assets.length === 1 ? 'file' : 'files'} moved to the trash`
      )
    }
    return response.redirect().back()
  }
}
