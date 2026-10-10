import type { HttpContext } from '@adonisjs/core/http'
import Asset from '../models/asset.js'
import { folderTree } from '../services/folders.js'
import { assetOption, libraryQuery, parseFilters } from '../services/library.js'

function idList(value: unknown) {
  return String(value ?? '')
    .split(',')
    .map(Number)
    .filter((id) => Number.isInteger(id) && id > 0)
}

export default class AssetLookupsController {
  async index({ request, bouncer }: HttpContext) {
    await bouncer.authorize('access', 'assets:read')
    const qs = request.qs()
    if (qs.ids) {
      const assets = await Asset.query()
        .apply((scopes) => scopes.active())
        .whereIn('id', idList(qs.ids))
      return { data: assets.map(assetOption) }
    }
    const filters = parseFilters(qs)
    const paginator = await libraryQuery(filters).paginate(Math.max(1, Number(qs.page) || 1), 40)
    return {
      data: paginator.all().map(assetOption),
      folders: qs.withFolders ? await folderTree() : undefined,
      meta: {
        total: paginator.total,
        currentPage: paginator.currentPage,
        lastPage: paginator.lastPage,
      },
    }
  }
}
