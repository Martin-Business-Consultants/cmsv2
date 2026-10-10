import { middleware } from '#start/kernel'
import { controllers } from '#generated/controllers'
import router from '@adonisjs/core/services/router'
import '#start/plugins'
import { plugins } from '#services/plugins'
import env from '#start/env'

const DELIVERY_THROTTLE = {
  scope: 'api/v1',
  requests: env.get('CMS_DELIVERY_RATE_LIMIT', 1200),
  by: 'caller' as const,
}

router
  .group(() => {
    router.get('login', [controllers.Session, 'create'])
    router.post('login', [controllers.Session, 'store'])
    router.get('login/challenge', [controllers.Session, 'challenge']).as('session.challenge')
    router.post('login/challenge', [controllers.Session, 'verify']).as('session.verify')
    router.post('login/cancel', [controllers.Session, 'cancel']).as('session.cancel')
    router.get('signup', [controllers.Registrations, 'create']).as('signup.create')
    router.post('signup', [controllers.Registrations, 'store']).as('signup.store')
    router.get('password-reset', [controllers.PasswordResets, 'create']).as('password_reset.create')
    router.post('password-reset', [controllers.PasswordResets, 'store']).as('password_reset.store')
    router
      .get('password-reset/:token', [controllers.PasswordResets, 'edit'])
      .as('password_reset.edit')
    router
      .put('password-reset/:token', [controllers.PasswordResets, 'update'])
      .as('password_reset.update')
  })
  .prefix('admin')
  .use(middleware.guest())

router
  .get('admin/email-verification/:token', [controllers.EmailVerifications, 'show'])
  .as('email_verification.show')

router
  .group(() => {
    router.post('logout', [controllers.Session, 'destroy'])
    router.get('/', [controllers.admin.Dashboard, 'show'])

    router.get('pages', [controllers.admin.Pages, 'index'])
    router.post('pages/bulk', [controllers.admin.BulkActions, 'pages']).as('pages.bulk')
    router.get('pages/new', [controllers.admin.Pages, 'create'])
    router.post('pages', [controllers.admin.Pages, 'store'])
    router.get('pages/:id/edit', [controllers.admin.Pages, 'edit'])
    router.put('pages/:id', [controllers.admin.Pages, 'update'])
    router.delete('pages/:id', [controllers.admin.Pages, 'destroy'])
    router.post('pages/:id/publication', [controllers.admin.PagePublications, 'store'])
    router.delete('pages/:id/publication', [controllers.admin.PagePublications, 'destroy'])
    router.get('pages/:id/versions', [controllers.admin.PageVersions, 'index'])
    router.get('pages/:id/versions/:versionId', [controllers.admin.PageVersions, 'show'])
    router.post('pages/:id/versions/:versionId/restore', [
      controllers.admin.PageVersions,
      'restore',
    ])
    router.get('pages/:id/preview', [controllers.admin.Previews, 'page'])
    router.get('pages/:id/fields', [controllers.admin.PageFields, 'show'])
    router.put('pages/:id/fields', [controllers.admin.PageFields, 'update'])
    router
      .post('pages/:id/translations', [controllers.admin.Translations, 'page'])
      .as('translations.page')
    router
      .post('pages/taxonomy-pools', [controllers.admin.TaxonomyPools, 'pages'])
      .as('taxonomy_pools.pages')
    router
      .post('collections/:collectionId/entries/:id/translations', [
        controllers.admin.Translations,
        'entry',
      ])
      .as('translations.entry')

    router.get('collections', [controllers.admin.Collections, 'index'])
    router
      .post('collections/bulk', [controllers.admin.BulkActions, 'collections'])
      .as('collections.bulk')
    router.get('collections/new', [controllers.admin.Collections, 'create'])
    router.post('collections', [controllers.admin.Collections, 'store'])
    router.get('collections/:id/edit', [controllers.admin.Collections, 'edit'])
    router.put('collections/:id', [controllers.admin.Collections, 'update'])
    router.delete('collections/:id', [controllers.admin.Collections, 'destroy'])

    router.get('collections/:collectionId/entries', [controllers.admin.Entries, 'index'])
    router
      .post('collections/:collectionId/entries/bulk', [controllers.admin.BulkActions, 'entries'])
      .as('entries.bulk')
    router.get('collections/:collectionId/entries/new', [controllers.admin.Entries, 'create'])
    router.get('collections/:collectionId/entries/build', [controllers.admin.EntryBoards, 'show'])
    router.put('collections/:collectionId/entries/:id/flag', [controllers.admin.EntryBoards, 'flag'])
    router.put('collections/:collectionId/entries/:id/card-field', [
      controllers.admin.EntryBoards,
      'cardField',
    ])
    router.put('collections/:collectionId/entries/:id/placement', [
      controllers.admin.EntryBoards,
      'place',
    ])
    router.post('collections/:collectionId/entries', [controllers.admin.Entries, 'store'])
    router.get('collections/:collectionId/entries/:id/edit', [controllers.admin.Entries, 'edit'])
    router.put('collections/:collectionId/entries/:id', [controllers.admin.Entries, 'update'])
    router.delete('collections/:collectionId/entries/:id', [controllers.admin.Entries, 'destroy'])
    router.post('collections/:collectionId/entries/:id/publication', [
      controllers.admin.EntryPublications,
      'store',
    ])
    router.delete('collections/:collectionId/entries/:id/publication', [
      controllers.admin.EntryPublications,
      'destroy',
    ])
    router.get('collections/:collectionId/entries/:id/versions', [
      controllers.admin.EntryVersions,
      'index',
    ])
    router.get('collections/:collectionId/entries/:id/versions/:versionId', [
      controllers.admin.EntryVersions,
      'show',
    ])
    router.post('collections/:collectionId/entries/:id/versions/:versionId/restore', [
      controllers.admin.EntryVersions,
      'restore',
    ])
    router.get('collections/:collectionId/entries/:id/preview', [
      controllers.admin.Previews,
      'entry',
    ])

    router.get('globals', [controllers.admin.Globals, 'index'])
    router.post('globals/bulk', [controllers.admin.BulkActions, 'globals']).as('globals.bulk')
    router.get('globals/new', [controllers.admin.Globals, 'create'])
    router.post('globals', [controllers.admin.Globals, 'store'])
    router.get('globals/:id/edit', [controllers.admin.Globals, 'edit'])
    router.put('globals/:id', [controllers.admin.Globals, 'update'])
    router.put('globals/:id/fields', [controllers.admin.Globals, 'updateFields'])
    router.delete('globals/:id', [controllers.admin.Globals, 'destroy'])

    router.get('block-types', [controllers.admin.BlockTypes, 'index'])
    router
      .post('block-types/bulk', [controllers.admin.BulkActions, 'blockTypes'])
      .as('block_types.bulk')
    router.get('block-types/new', [controllers.admin.BlockTypes, 'create'])
    router.post('block-types', [controllers.admin.BlockTypes, 'store'])
    router.post('block-types/seed', [controllers.admin.BlockTypes, 'seed'])
    router.get('block-types/:id/edit', [controllers.admin.BlockTypes, 'edit'])
    router.put('block-types/:id', [controllers.admin.BlockTypes, 'update'])
    router.delete('block-types/:id', [controllers.admin.BlockTypes, 'destroy'])

    router.get('lookups/pages', [controllers.admin.Lookups, 'pages'])
    router.get('lookups/entries', [controllers.admin.Lookups, 'entries'])
    router.post('markdown-preview', [controllers.admin.MarkdownPreviews, 'store'])

    router.get('redirects', [controllers.admin.Redirects, 'index'])
    router.post('redirects/bulk', [controllers.admin.BulkActions, 'redirects']).as('redirects.bulk')
    router.post('redirects', [controllers.admin.Redirects, 'store'])
    router.put('redirects/:id', [controllers.admin.Redirects, 'update'])
    router.delete('redirects/:id', [controllers.admin.Redirects, 'destroy'])

    router.get('users', [controllers.admin.Users, 'index'])
    router.post('users/bulk', [controllers.admin.BulkActions, 'users']).as('users.bulk')
    router.get('users/new', [controllers.admin.Users, 'create'])
    router.post('users', [controllers.admin.Users, 'store'])
    router.get('users/:id/edit', [controllers.admin.Users, 'edit'])
    router.put('users/:id', [controllers.admin.Users, 'update'])
    router.delete('users/:id', [controllers.admin.Users, 'destroy'])

    router.get('roles', [controllers.admin.Roles, 'index'])
    router.post('roles/bulk', [controllers.admin.BulkActions, 'roles']).as('roles.bulk')
    router.get('roles/new', [controllers.admin.Roles, 'create'])
    router.post('roles', [controllers.admin.Roles, 'store'])
    router.get('roles/:id/edit', [controllers.admin.Roles, 'edit'])
    router.put('roles/:id', [controllers.admin.Roles, 'update'])
    router.delete('roles/:id', [controllers.admin.Roles, 'destroy'])

    router.get('settings/api-token', [controllers.admin.ApiTokens, 'show'])
    router.post('settings/api-token/reveal', [controllers.admin.ApiTokens, 'reveal'])
    router.post('settings/api-token/rotate', [controllers.admin.ApiTokens, 'rotate'])
    router.get('settings/service-tokens', [controllers.admin.ServiceTokens, 'index'])
    router.post('settings/service-tokens', [controllers.admin.ServiceTokens, 'store'])
    router.post('settings/service-tokens/:id/reveal', [controllers.admin.ServiceTokens, 'reveal'])
    router.post('settings/service-tokens/:id/rotate', [controllers.admin.ServiceTokens, 'rotate'])
    router.post('settings/service-tokens/:id/revoke', [controllers.admin.ServiceTokens, 'revoke'])
    router
      .get('api-clients', ({ response }) => response.redirect('/admin/settings/service-tokens'))
      .as('api_clients.legacy')

    router.get('settings', [controllers.admin.Settings, 'edit'])
    router.put('settings', [controllers.admin.Settings, 'update'])
    router.get('settings/general', [controllers.admin.GeneralSettings, 'edit'])
    router.put('settings/general', [controllers.admin.GeneralSettings, 'update'])
    router.get('settings/branding', [controllers.admin.Branding, 'edit'])
    router.put('settings/branding', [controllers.admin.Branding, 'update'])
    router.get('settings/languages', [controllers.admin.LanguagesSettings, 'edit'])
    router.put('settings/languages', [controllers.admin.LanguagesSettings, 'update'])
    router.put('settings/brand', [controllers.admin.BrandBrief, 'update'])
    router.get('account', [controllers.admin.Account, 'edit'])
    router.put('account', [controllers.admin.Account, 'update'])
    router.put('account/email', [controllers.admin.Account, 'updateEmail']).as('account.email')
    router
      .put('account/password', [controllers.admin.Account, 'updatePassword'])
      .as('account.password')
    router.delete('account', [controllers.admin.Account, 'destroy']).as('account.destroy')
    router
      .post('account/email-verification', [controllers.EmailVerifications, 'store'])
      .as('account.email_verification')
    router.post('account/two-factor', [controllers.admin.TwoFactor, 'store']).as('two_factor.store')
    router
      .post('account/two-factor/recovery-codes', [controllers.admin.TwoFactor, 'regenerate'])
      .as('two_factor.regenerate')
    router
      .delete('account/two-factor', [controllers.admin.TwoFactor, 'destroy'])
      .as('two_factor.destroy')
    router
      .delete('account/sessions/:id', [controllers.admin.AccountSessions, 'destroy'])
      .as('account_sessions.destroy')

    router.get('plugins', [controllers.admin.Plugins, 'index'])
    router.put('plugins/:key', [controllers.admin.Plugins, 'update'])

    router.get('audit-log', [controllers.admin.AuditLogs, 'index'])

    router.get('webhooks', [controllers.admin.Webhooks, 'index'])
    router.get('webhooks/new', [controllers.admin.Webhooks, 'create'])
    router.post('webhooks', [controllers.admin.Webhooks, 'store'])
    router.get('webhooks/:id/edit', [controllers.admin.Webhooks, 'edit'])
    router.put('webhooks/:id', [controllers.admin.Webhooks, 'update'])
    router.delete('webhooks/:id', [controllers.admin.Webhooks, 'destroy'])
    router.post('webhooks/:id/secret', [controllers.admin.Webhooks, 'rotateSecret'])
    router.post('webhooks/:id/test', [controllers.admin.Webhooks, 'test'])

    router.get('trash', [controllers.admin.Trash, 'index'])
    router.post('trash/bulk', [controllers.admin.Trash, 'bulk']).as('trash.bulk')
    router.get('trash/:type/:id', [controllers.admin.Trash, 'show'])
    router.post('trash/:type/:id/restore', [controllers.admin.Trash, 'restore'])
    router.delete('trash/:type/:id', [controllers.admin.Trash, 'destroy'])
  })
  .prefix('admin')
  .as('admin')
  .use(middleware.auth())

router
  .group(() => {
    router.get('site', [controllers.api.Site, 'show'])
    router.get('schema', [controllers.api.Schema, 'show'])
    router.get('pages', [controllers.api.Pages, 'index'])
    router.get('pages/*', [controllers.api.Pages, 'show'])
    router.get('collections', [controllers.api.Collections, 'index'])
    router.get('collections/:slug', [controllers.api.Collections, 'show'])
    router.get('collections/:slug/entries', [controllers.api.Entries, 'index'])
    router.get('collections/:slug/entries/:entrySlug', [controllers.api.Entries, 'show'])
    router.get('globals', [controllers.api.Globals, 'index'])
    router.get('globals/:slug', [controllers.api.Globals, 'show'])
    router.get('redirects', [controllers.api.Redirects, 'index'])
    router.get('sitemap', [controllers.api.Sitemap, 'show'])
  })
  .prefix('api/v1')
  .as('api')
  .use([middleware.apiAuth(), middleware.apiThrottle(DELIVERY_THROTTLE)])

router
  .group(() => {
    router.post('device/code', [controllers.management.DeviceAuthorizations, 'store']).as('code')
    router.post('device/token', [controllers.management.DeviceAuthorizations, 'token']).as('token')
  })
  .prefix('api')
  .as('public.device')
  .use(middleware.apiThrottle({ scope: 'api/device', requests: 30, shape: 'device' }))

router
  .group(() => {
    router.get('api_tokens/me', [controllers.management.ApiTokens, 'me'])
    router.patch('collections/:slug/entries/:entrySlug/toggle_field', [
      controllers.management.EntryBoard,
      'toggleField',
    ])
    router.patch('collections/:slug/entries/:entrySlug/update_field', [
      controllers.management.EntryBoard,
      'updateField',
    ])
    router.patch('collections/:slug/entries/:entrySlug/move', [
      controllers.management.EntryBoard,
      'move',
    ])
    router.post('api_tokens/rotate', [controllers.management.ApiTokens, 'rotate'])
    router.get('service_tokens', [controllers.management.ServiceTokens, 'index'])
    router.post('service_tokens', [controllers.management.ServiceTokens, 'store'])
    router.get('service_tokens/:id', [controllers.management.ServiceTokens, 'show'])
    router.post('service_tokens/:id/reveal', [controllers.management.ServiceTokens, 'reveal'])
    router.post('service_tokens/:id/rotate', [controllers.management.ServiceTokens, 'rotate'])
    router.post('service_tokens/:id/revoke', [controllers.management.ServiceTokens, 'revoke'])
  })
  .prefix('api')
  .as('management')
  .use(middleware.managementApi())

router.get('connect', [controllers.Connect, 'show']).as('connect.show')
router.post('connect', [controllers.Connect, 'store']).as('connect.store')

plugins.registerRoutes(router, {
  admin: (define, plugin) =>
    router
      .group(define)
      .prefix('admin')
      .as('admin')
      .use([middleware.auth(), middleware.pluginEnabled({ plugin })]),
  site: (define, plugin) => router.group(define).use(middleware.pluginEnabled({ plugin })),
  api: (define, plugin) =>
    router
      .group(define)
      .prefix('api/v1')
      .as('api')
      .use([
        middleware.apiAuth(),
        middleware.apiThrottle(DELIVERY_THROTTLE),
        middleware.pluginEnabled({ plugin }),
      ]),
})

router.get('branding.css', [controllers.BrandingStylesheets, 'show']).as('branding.css')
router.get('up', [controllers.Health, 'show']).as('health')
router.get('sitemap.xml', [controllers.site.Sitemap, 'show'])
router.get('robots.txt', [controllers.site.Robots, 'show'])
router.get('/', [controllers.site.Pages, 'show']).as('site.home')
router.get('*', [controllers.site.Pages, 'show']).as('site.page')
