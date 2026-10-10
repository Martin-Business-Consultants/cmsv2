import type { HttpContext } from '@adonisjs/core/http'
import Asset from '../models/asset.js'
import { apiAsset, libraryQuery, parseFilters } from '../services/library.js'
import {
  authorizeClient,
  badRequest,
  notFound,
  pageMeta,
  pagination,
  respond,
} from '#services/delivery'

export default class ApiAssetsController {
  async index(ctx: HttpContext) {
    authorizeClient(ctx, 'assets:read')
    const { page, perPage } = pagination(ctx)
    const qs = ctx.request.qs()
    const { search, type, folder } = parseFilters(qs)
    const paginator = await libraryQuery({
      search,
      type,
      folder: qs.folder === undefined ? undefined : folder,
    }).paginate(page, perPage)
    return respond(ctx, paginator.all().map(apiAsset), pageMeta(paginator))
  }

  async show(ctx: HttpContext) {
    authorizeClient(ctx, 'assets:read')
    const id = Number(ctx.params.id)
    if (!Number.isInteger(id) || id < 1) badRequest('Asset id must be a positive integer')
    const asset = await Asset.query()
      .apply((scopes) => scopes.active())
      .where('id', id)
      .first()
    if (!asset) notFound(`No asset ${id}`)
    return respond(ctx, apiAsset(asset))
  }
}
