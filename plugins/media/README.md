# Media

The media library for LibrePublish, built as an ordinary plugin (key `media`, on by default). It is
also the reference example for writing a plugin: everything below is plain Adonis plus a handful of
calls on the plugin API in `plugin.ts`.

## What it does

- **Library** at `/admin/media`: a folder tree, breadcrumbs, a grid or table view (remembered per
  browser), search across every folder, type tabs (images, video, audio, documents) and a "Missing
  alt text" filter.
- **Folders**: create, rename, move (into another folder) and delete. Deleting a folder never
  deletes files; its contents move up a level. Files move between folders by drag and drop onto the
  tree, from the details sheet, or in bulk.
- **Uploads**: multi-file, drag and drop anywhere on the library or on **Add new**
  (`/admin/media/new`), three at a time with per-file progress. Each file is streamed straight to
  disk, so the 20 MB body-parser limit doesn't apply. Limits: 50 MB and 100 megapixels per file.
- **Zip uploads**: a `.zip` (up to 2 GB, 2,000 files) is unpacked into a folder named after it,
  keeping its inner folders, with unpacking progress streamed back to the browser. The reader uses
  only `node:zlib`; there's no extra dependency. Zip64 and encrypted archives are refused.
- **Details sheet** (shadcn Sheet with Tabs): title, alt text, caption, description, folder, a
  focal point picker with crop previews, file info, **Replace file** (keeps the id, title, alt and
  every place the file is used), "Used in" (pages, entries and globals that reference it by id or
  embed its URL in rich text), copy URL, and Move to trash.
- **Bulk actions**: select files, then move them to a folder or move them to the trash.
- **Trash**: deleted files go to the core Trash, where they can be restored or deleted permanently
  (deleting permanently removes the file and its resized copies).
- **Image sizes**: JPEG, PNG, WebP and AVIF get WebP copies 640, 1280 and 1920 px wide (via
  `sharp`), exposed as `srcset`.
- **Picker**: the dialog an asset field, the SEO image and the rich text editor's Image button open,
  with folders, search, type filter and upload.
- **Dashboard widget**: file count, storage used, recent images and images without alt text.
- **Delivery API**: `GET /api/v1/assets` and `GET /api/v1/assets/:id` (absolute URLs, sizes, focal
  point). Both need the `assets:read` capability.

Uploaded files are served by Drive at `/uploads/*` whether the plugin is on or off, so content that
embeds them keeps working. The core's `UploadHeadersMiddleware` sends `X-Content-Type-Options:
nosniff` on every upload and a sandboxing `Content-Security-Policy` on SVGs, so a script inside an
uploaded SVG can't run.

## Layout

```
plugins/media/
  plugin.ts                         the registration (below)
  app/models/asset.ts               Lucid model, self-contained (BaseModel + @column)
  app/models/asset_folder.ts        stored folders, so empty folders persist
  app/services/media.ts             store, replace, unzip, move, trash, restore, purge
  app/services/folders.ts           folder paths, tree, create, move, remove
  app/services/library.ts           list queries and the shapes the core and API read
  app/services/usage.ts             "Used in" and images without alt text
  app/services/archive.ts           a small zip reader on node:zlib
  app/services/uploads.ts           streams a request body to a temp file with a size cap
  app/controllers/*.ts              thin controllers over the services
  app/validators/asset.ts           VineJS validators
  app/transformers/asset_transformer.ts
  database/migrations/*.ts          picked up by `node ace migration:run`
  inertia/pages/admin/index.tsx     rendered as 'media/admin/index'
  inertia/pages/admin/create.tsx    rendered as 'media/admin/create'
  inertia/slots/asset_input.tsx     fills the core's asset field
  inertia/slots/asset_picker.tsx    fills the core's picker dialog
  inertia/widgets/library.tsx       the dashboard widget
  inertia/components/**, lib/**     the plugin's own React code
```

Controllers stay thin: the services take plain values (paths, buffers, ids) and return models, so a
management API can reuse them as they are.

## How it uses the plugin API

| Call                                                                                       | What Media does with it                                                                                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `definePlugin({ key, name, version, description, enabledByDefault: true, register })`      | Declares the plugin. `enabledByDefault` makes it active on a fresh install.                                                                                                                                                                                                                                  |
| `cms.menu({ id: 'media', group: 'Content', after: 'globals', icon: 'image', capability })` | The **Media** item in the admin menu, right after Globals.                                                                                                                                                                                                                                                   |
| `cms.submenu({ parent: 'media', label: 'Library' \| 'Add new', … })`                       | Its two submenu links.                                                                                                                                                                                                                                                                                       |
| `cms.newItem({ label: 'Media', href: '/admin/media/new' })`                                | "Media" in the admin bar's **+ New** menu.                                                                                                                                                                                                                                                                   |
| `cms.dashboardWidget({ id, title, component: 'library', props })`                          | The widget; `props(ctx)` runs on the server and its result is passed to `inertia/widgets/library.tsx`.                                                                                                                                                                                                       |
| `cms.routes('admin', router => …)`                                                         | Library, upload, folders, bulk, replace and lookup routes under `/admin`, named `admin.media.*`, behind auth and the plugin-enabled guard. Each action still authorizes with Bouncer (`assets:read`, `assets:write`, `assets:delete`).                                                                       |
| `cms.routes('api', router => …)`                                                           | `/api/v1/assets[/:id]`, named `api.assets.*`, behind token auth.                                                                                                                                                                                                                                             |
| `cms.api(path, description)`                                                               | Lists both endpoints on the Plugins screen and wherever the core lists endpoints.                                                                                                                                                                                                                            |
| `cms.provide('media', { resolve, imagesWithoutAlt })`                                      | The core's media provider. `resolve(ids)` returns `Map<id, ResolvedAsset>` and is what every asset field, SEO image, logo and favicon go through, on the site and in the API. `imagesWithoutAlt()` is for site health. With the plugin off, nothing provides `media`, so the core resolves assets to `null`. |
| `cms.trashable({ kind: 'asset', label: 'Media', list, restore, purge })`                   | Puts trashed files in the core Trash.                                                                                                                                                                                                                                                                        |
| `useSlot('asset_input')`, `useSlot('asset_picker')` (core side)                            | The core renders whatever `inertia/slots/<name>.tsx` an enabled plugin ships. Without Media, an asset field is a plain number input and the rich text editor hides its Image button.                                                                                                                         |

Capabilities: `assets:read`, `assets:write` and `assets:delete` stay in the core catalog
(`app/types/permissions.ts`), as they do in the Rails app. The asset field, the SEO image and
branding are core, and roles keep these capabilities while the plugin is off. So Media doesn't call
`cms.permissions(...)`. A plugin that owns its own capabilities would call it with `defaults`, which
are granted to the built-in roles the first time the plugin is set up.

## Events other plugins can hook

Every write goes through the core `audit()`, which records it in the audit log and emits it to
plugin listeners (`cms.on('asset.uploaded', …)`, `cms.on('asset.*', …)`):

- `asset.uploaded` (metadata: `folder`, plus `size`/`mimeType`, or `archive` for zip contents)
- `asset.updated`, `asset.moved`, `asset.replaced`
- `asset.trashed`, and `asset.deleted` when a file is deleted permanently from the Trash (the core
  also logs `trash.restored` / `trash.purged` with `kind: 'asset'`)
- `asset_folder.created`, `asset_folder.updated`, `asset_folder.deleted`

## Not included yet

The management API (`/api/assets` writes, `/api/asset_folders`, `/api/bulk_uploads`) and background
processing of zips: a zip is unpacked during its upload request, with progress streamed back.
