import { definePlugin, plugins } from '#services/plugins'
import Asset from './app/models/asset.js'
import { purgeAsset, restoreAsset } from './app/services/media.js'
import { deliverAssets, resolveAssets, resolvedAsset } from './app/services/library.js'
import { imagesWithoutAlt } from './app/services/usage.js'

const AssetsController = () => import('./app/controllers/assets_controller.js')
const AssetFoldersController = () => import('./app/controllers/asset_folders_controller.js')
const AssetLookupsController = () => import('./app/controllers/asset_lookups_controller.js')
const ApiAssetsController = () => import('./app/controllers/api_assets_controller.js')

export default definePlugin({
  key: 'media',
  name: 'Media',
  version: '1.0.0',
  description:
    'The media library: folders, drag-and-drop and zip uploads, image sizes, alt text and focal points, and the picker that asset fields open.',
  author: 'LibrePublish',
  enabledByDefault: true,

  register(cms) {
    cms.menu({
      id: 'media',
      label: 'Media',
      icon: 'image',
      group: 'Content',
      after: 'globals',
      href: '/admin/media',
      capability: 'assets:read',
    })
    cms.submenu({
      parent: 'media',
      label: 'Library',
      href: '/admin/media',
      capability: 'assets:read',
    })
    cms.submenu({
      parent: 'media',
      label: 'Add new',
      href: '/admin/media/new',
      capability: 'assets:write',
    })
    cms.newItem({ label: 'Media', href: '/admin/media/new', capability: 'assets:write' })

    cms.dashboardWidget({
      id: 'library',
      title: 'Media',
      component: 'library',
      capability: 'assets:read',
      async props() {
        const active = () => Asset.query().apply((scopes) => scopes.active())
        const [totals] = await active().count('* as files').sum('size as bytes')
        const recent = await active()
          .whereLike('mime_type', 'image/%')
          .orderBy('id', 'desc')
          .limit(6)
        const missing = await imagesWithoutAlt()
        return {
          files: Number(totals.$extras.files ?? 0),
          bytes: Number(totals.$extras.bytes ?? 0),
          missingAlt: missing.images.length,
          missingAltInUse: missing.inUse.length,
          recent: recent.map(resolvedAsset),
        }
      },
    })

    cms.routes('admin', (router) => {
      router.get('media', [AssetsController, 'index']).as('media.index')
      router.get('media/new', [AssetsController, 'create']).as('media.create')
      router.get('media/lookup', [AssetLookupsController, 'index']).as('media.lookup')
      router.post('media/uploads', [AssetsController, 'store']).as('media.store')
      router.post('media/bulk', [AssetsController, 'bulk']).as('media.bulk')
      router.post('media/folders', [AssetFoldersController, 'store']).as('media.folders.store')
      router.put('media/folders', [AssetFoldersController, 'update']).as('media.folders.update')
      router
        .delete('media/folders', [AssetFoldersController, 'destroy'])
        .as('media.folders.destroy')
      router
        .put('media/:id', [AssetsController, 'update'])
        .where('id', router.matchers.number())
        .as('media.update')
      router
        .put('media/:id/file', [AssetsController, 'replace'])
        .where('id', router.matchers.number())
        .as('media.replace')
      router
        .delete('media/:id', [AssetsController, 'destroy'])
        .where('id', router.matchers.number())
        .as('media.destroy')
    })

    cms.routes('api', (router) => {
      router.get('assets', [ApiAssetsController, 'index']).as('assets.index')
      router
        .get('assets/:id', [ApiAssetsController, 'show'])
        .where('id', router.matchers.number())
        .as('assets.show')
    })
    cms.api('/api/v1/assets', 'Files in the media library (?folder=, ?type=, ?search=, paged)')
    cms.api('/api/v1/assets/:id', 'One file: title, alt, caption, focal point, sizes and URLs')

    cms.provide('media', {
      resolve: resolveAssets,
      deliver: deliverAssets,
      async imagesWithoutAlt() {
        const { images, inUse } = await imagesWithoutAlt()
        return { total: images.length, inUse: inUse.map(resolvedAsset) }
      },
    })

    cms.searchable({
      kind: 'asset',
      label: 'Media',
      capability: 'assets:read',
      href: (id) => `/admin/media?selected=${id}`,
      async documents() {
        const assets = await Asset.query().apply((scopes) => scopes.active())
        return assets.map((asset) => asset.searchDocument)
      },
    })

    cms.trashable({
      kind: 'asset',
      label: 'Media',
      async list() {
        const assets = await Asset.query()
          .apply((scopes) => scopes.trashed())
          .orderBy('deleted_at', 'desc')
        return assets.map((asset) => ({
          id: asset.id,
          title: asset.displayTitle,
          detail: asset.folder === '/' ? asset.filename : `${asset.folder}/${asset.filename}`,
          deletedAt: asset.deletedAt?.toISO() ?? null,
        }))
      },
      async restore(id) {
        await restoreAsset(id)
      },
      async purge(id) {
        const asset = await purgeAsset(id)
        await plugins.emit({
          action: 'asset.deleted',
          subject: { type: 'Asset', id: asset.id, label: asset.displayTitle, record: asset },
          metadata: { key: asset.key },
          userId: null,
        })
      },
    })
  },
})
