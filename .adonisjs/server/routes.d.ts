import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'drive.fs.serve': { paramsTuple: [...ParamValue[]]; params: {'*': ParamValue[]} }
    'session.create': { paramsTuple?: []; params?: {} }
    'session.store': { paramsTuple?: []; params?: {} }
    'session.challenge': { paramsTuple?: []; params?: {} }
    'session.verify': { paramsTuple?: []; params?: {} }
    'session.cancel': { paramsTuple?: []; params?: {} }
    'signup.create': { paramsTuple?: []; params?: {} }
    'signup.store': { paramsTuple?: []; params?: {} }
    'password_reset.create': { paramsTuple?: []; params?: {} }
    'password_reset.store': { paramsTuple?: []; params?: {} }
    'password_reset.edit': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'password_reset.update': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'email_verification.show': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'admin.session.destroy': { paramsTuple?: []; params?: {} }
    'admin.dashboard.show': { paramsTuple?: []; params?: {} }
    'admin.pages.index': { paramsTuple?: []; params?: {} }
    'admin.pages.bulk': { paramsTuple?: []; params?: {} }
    'admin.pages.create': { paramsTuple?: []; params?: {} }
    'admin.pages.store': { paramsTuple?: []; params?: {} }
    'admin.pages.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.pages.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.pages.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.page_publications.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.page_publications.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.page_versions.index': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.page_versions.show': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'versionId': ParamValue} }
    'admin.page_versions.restore': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'versionId': ParamValue} }
    'admin.previews.page': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.page_fields.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.page_fields.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.translations.page': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.taxonomy_pools.pages': { paramsTuple?: []; params?: {} }
    'admin.translations.entry': { paramsTuple: [ParamValue,ParamValue]; params: {'collectionId': ParamValue,'id': ParamValue} }
    'admin.collections.index': { paramsTuple?: []; params?: {} }
    'admin.collections.bulk': { paramsTuple?: []; params?: {} }
    'admin.collections.create': { paramsTuple?: []; params?: {} }
    'admin.collections.store': { paramsTuple?: []; params?: {} }
    'admin.collections.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.collections.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.collections.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.entries.index': { paramsTuple: [ParamValue]; params: {'collectionId': ParamValue} }
    'admin.entries.bulk': { paramsTuple: [ParamValue]; params: {'collectionId': ParamValue} }
    'admin.entries.create': { paramsTuple: [ParamValue]; params: {'collectionId': ParamValue} }
    'admin.entries.store': { paramsTuple: [ParamValue]; params: {'collectionId': ParamValue} }
    'admin.entries.edit': { paramsTuple: [ParamValue,ParamValue]; params: {'collectionId': ParamValue,'id': ParamValue} }
    'admin.entries.update': { paramsTuple: [ParamValue,ParamValue]; params: {'collectionId': ParamValue,'id': ParamValue} }
    'admin.entries.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'collectionId': ParamValue,'id': ParamValue} }
    'admin.entry_publications.store': { paramsTuple: [ParamValue,ParamValue]; params: {'collectionId': ParamValue,'id': ParamValue} }
    'admin.entry_publications.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'collectionId': ParamValue,'id': ParamValue} }
    'admin.entry_versions.index': { paramsTuple: [ParamValue,ParamValue]; params: {'collectionId': ParamValue,'id': ParamValue} }
    'admin.entry_versions.show': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'collectionId': ParamValue,'id': ParamValue,'versionId': ParamValue} }
    'admin.entry_versions.restore': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'collectionId': ParamValue,'id': ParamValue,'versionId': ParamValue} }
    'admin.previews.entry': { paramsTuple: [ParamValue,ParamValue]; params: {'collectionId': ParamValue,'id': ParamValue} }
    'admin.globals.index': { paramsTuple?: []; params?: {} }
    'admin.globals.bulk': { paramsTuple?: []; params?: {} }
    'admin.globals.create': { paramsTuple?: []; params?: {} }
    'admin.globals.store': { paramsTuple?: []; params?: {} }
    'admin.globals.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.globals.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.globals.update_fields': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.globals.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.block_types.index': { paramsTuple?: []; params?: {} }
    'admin.block_types.bulk': { paramsTuple?: []; params?: {} }
    'admin.block_types.create': { paramsTuple?: []; params?: {} }
    'admin.block_types.store': { paramsTuple?: []; params?: {} }
    'admin.block_types.seed': { paramsTuple?: []; params?: {} }
    'admin.block_types.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.block_types.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.block_types.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.lookups.pages': { paramsTuple?: []; params?: {} }
    'admin.lookups.entries': { paramsTuple?: []; params?: {} }
    'admin.markdown_previews.store': { paramsTuple?: []; params?: {} }
    'admin.redirects.index': { paramsTuple?: []; params?: {} }
    'admin.redirects.bulk': { paramsTuple?: []; params?: {} }
    'admin.redirects.store': { paramsTuple?: []; params?: {} }
    'admin.redirects.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.redirects.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.users.index': { paramsTuple?: []; params?: {} }
    'admin.users.bulk': { paramsTuple?: []; params?: {} }
    'admin.users.create': { paramsTuple?: []; params?: {} }
    'admin.users.store': { paramsTuple?: []; params?: {} }
    'admin.users.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.users.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.users.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.roles.index': { paramsTuple?: []; params?: {} }
    'admin.roles.bulk': { paramsTuple?: []; params?: {} }
    'admin.roles.create': { paramsTuple?: []; params?: {} }
    'admin.roles.store': { paramsTuple?: []; params?: {} }
    'admin.roles.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.roles.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.roles.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.api_tokens.show': { paramsTuple?: []; params?: {} }
    'admin.api_tokens.reveal': { paramsTuple?: []; params?: {} }
    'admin.api_tokens.rotate': { paramsTuple?: []; params?: {} }
    'admin.service_tokens.index': { paramsTuple?: []; params?: {} }
    'admin.service_tokens.store': { paramsTuple?: []; params?: {} }
    'admin.service_tokens.reveal': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.service_tokens.rotate': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.service_tokens.revoke': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.api_clients.legacy': { paramsTuple?: []; params?: {} }
    'admin.settings.edit': { paramsTuple?: []; params?: {} }
    'admin.settings.update': { paramsTuple?: []; params?: {} }
    'admin.general_settings.edit': { paramsTuple?: []; params?: {} }
    'admin.general_settings.update': { paramsTuple?: []; params?: {} }
    'admin.branding.edit': { paramsTuple?: []; params?: {} }
    'admin.branding.update': { paramsTuple?: []; params?: {} }
    'admin.languages_settings.edit': { paramsTuple?: []; params?: {} }
    'admin.languages_settings.update': { paramsTuple?: []; params?: {} }
    'admin.brand_brief.update': { paramsTuple?: []; params?: {} }
    'admin.account.edit': { paramsTuple?: []; params?: {} }
    'admin.account.update': { paramsTuple?: []; params?: {} }
    'admin.account.email': { paramsTuple?: []; params?: {} }
    'admin.account.password': { paramsTuple?: []; params?: {} }
    'admin.account.destroy': { paramsTuple?: []; params?: {} }
    'admin.account.email_verification': { paramsTuple?: []; params?: {} }
    'admin.two_factor.store': { paramsTuple?: []; params?: {} }
    'admin.two_factor.regenerate': { paramsTuple?: []; params?: {} }
    'admin.two_factor.destroy': { paramsTuple?: []; params?: {} }
    'admin.account_sessions.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.plugins.index': { paramsTuple?: []; params?: {} }
    'admin.plugins.update': { paramsTuple: [ParamValue]; params: {'key': ParamValue} }
    'admin.audit_logs.index': { paramsTuple?: []; params?: {} }
    'admin.webhooks.index': { paramsTuple?: []; params?: {} }
    'admin.webhooks.create': { paramsTuple?: []; params?: {} }
    'admin.webhooks.store': { paramsTuple?: []; params?: {} }
    'admin.webhooks.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.webhooks.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.webhooks.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.webhooks.rotate_secret': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.webhooks.test': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.trash.index': { paramsTuple?: []; params?: {} }
    'admin.trash.bulk': { paramsTuple?: []; params?: {} }
    'admin.trash.show': { paramsTuple: [ParamValue,ParamValue]; params: {'type': ParamValue,'id': ParamValue} }
    'admin.trash.restore': { paramsTuple: [ParamValue,ParamValue]; params: {'type': ParamValue,'id': ParamValue} }
    'admin.trash.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'type': ParamValue,'id': ParamValue} }
    'api.site.show': { paramsTuple?: []; params?: {} }
    'api.schema.show': { paramsTuple?: []; params?: {} }
    'api.pages.index': { paramsTuple?: []; params?: {} }
    'api.pages.show': { paramsTuple: [...ParamValue[]]; params: {'*': ParamValue[]} }
    'api.collections.index': { paramsTuple?: []; params?: {} }
    'api.collections.show': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'api.entries.index': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'api.entries.show': { paramsTuple: [ParamValue,ParamValue]; params: {'slug': ParamValue,'entrySlug': ParamValue} }
    'api.globals.index': { paramsTuple?: []; params?: {} }
    'api.globals.show': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'api.redirects.index': { paramsTuple?: []; params?: {} }
    'api.sitemap.show': { paramsTuple?: []; params?: {} }
    'public.device.code': { paramsTuple?: []; params?: {} }
    'public.device.token': { paramsTuple?: []; params?: {} }
    'management.api_tokens.me': { paramsTuple?: []; params?: {} }
    'management.api_tokens.rotate': { paramsTuple?: []; params?: {} }
    'management.service_tokens.index': { paramsTuple?: []; params?: {} }
    'management.service_tokens.store': { paramsTuple?: []; params?: {} }
    'management.service_tokens.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'management.service_tokens.reveal': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'management.service_tokens.rotate': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'management.service_tokens.revoke': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'connect.show': { paramsTuple?: []; params?: {} }
    'connect.store': { paramsTuple?: []; params?: {} }
    'admin.forms.index': { paramsTuple?: []; params?: {} }
    'admin.forms.create': { paramsTuple?: []; params?: {} }
    'admin.forms.store': { paramsTuple?: []; params?: {} }
    'admin.forms.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.forms.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.forms.duplicate': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.forms.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.lookups.forms': { paramsTuple?: []; params?: {} }
    'admin.forms.submissions': { paramsTuple: [ParamValue]; params: {'formId': ParamValue} }
    'admin.forms.submissions.export': { paramsTuple: [ParamValue]; params: {'formId': ParamValue} }
    'admin.submissions.index': { paramsTuple?: []; params?: {} }
    'admin.submissions.bulk': { paramsTuple?: []; params?: {} }
    'admin.submissions.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.submissions.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.submissions.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.submissions.file': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'field': ParamValue} }
    'admin.settings.forms.edit': { paramsTuple?: []; params?: {} }
    'admin.settings.forms.update': { paramsTuple?: []; params?: {} }
    'public.forms.submit': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'api.forms.index': { paramsTuple?: []; params?: {} }
    'api.forms.show': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'admin.media.index': { paramsTuple?: []; params?: {} }
    'admin.media.create': { paramsTuple?: []; params?: {} }
    'admin.media.lookup': { paramsTuple?: []; params?: {} }
    'admin.media.store': { paramsTuple?: []; params?: {} }
    'admin.media.bulk': { paramsTuple?: []; params?: {} }
    'admin.media.folders.store': { paramsTuple?: []; params?: {} }
    'admin.media.folders.update': { paramsTuple?: []; params?: {} }
    'admin.media.folders.destroy': { paramsTuple?: []; params?: {} }
    'admin.media.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.media.replace': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.media.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api.assets.index': { paramsTuple?: []; params?: {} }
    'api.assets.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'branding.css': { paramsTuple?: []; params?: {} }
    'health': { paramsTuple?: []; params?: {} }
    'sitemap.show': { paramsTuple?: []; params?: {} }
    'robots.show': { paramsTuple?: []; params?: {} }
    'site.home': { paramsTuple?: []; params?: {} }
    'site.page': { paramsTuple: [...ParamValue[]]; params: {'*': ParamValue[]} }
  }
  GET: {
    'drive.fs.serve': { paramsTuple: [...ParamValue[]]; params: {'*': ParamValue[]} }
    'session.create': { paramsTuple?: []; params?: {} }
    'session.challenge': { paramsTuple?: []; params?: {} }
    'signup.create': { paramsTuple?: []; params?: {} }
    'password_reset.create': { paramsTuple?: []; params?: {} }
    'password_reset.edit': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'email_verification.show': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'admin.dashboard.show': { paramsTuple?: []; params?: {} }
    'admin.pages.index': { paramsTuple?: []; params?: {} }
    'admin.pages.create': { paramsTuple?: []; params?: {} }
    'admin.pages.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.page_versions.index': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.page_versions.show': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'versionId': ParamValue} }
    'admin.previews.page': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.page_fields.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.collections.index': { paramsTuple?: []; params?: {} }
    'admin.collections.create': { paramsTuple?: []; params?: {} }
    'admin.collections.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.entries.index': { paramsTuple: [ParamValue]; params: {'collectionId': ParamValue} }
    'admin.entries.create': { paramsTuple: [ParamValue]; params: {'collectionId': ParamValue} }
    'admin.entries.edit': { paramsTuple: [ParamValue,ParamValue]; params: {'collectionId': ParamValue,'id': ParamValue} }
    'admin.entry_versions.index': { paramsTuple: [ParamValue,ParamValue]; params: {'collectionId': ParamValue,'id': ParamValue} }
    'admin.entry_versions.show': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'collectionId': ParamValue,'id': ParamValue,'versionId': ParamValue} }
    'admin.previews.entry': { paramsTuple: [ParamValue,ParamValue]; params: {'collectionId': ParamValue,'id': ParamValue} }
    'admin.globals.index': { paramsTuple?: []; params?: {} }
    'admin.globals.create': { paramsTuple?: []; params?: {} }
    'admin.globals.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.block_types.index': { paramsTuple?: []; params?: {} }
    'admin.block_types.create': { paramsTuple?: []; params?: {} }
    'admin.block_types.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.lookups.pages': { paramsTuple?: []; params?: {} }
    'admin.lookups.entries': { paramsTuple?: []; params?: {} }
    'admin.redirects.index': { paramsTuple?: []; params?: {} }
    'admin.users.index': { paramsTuple?: []; params?: {} }
    'admin.users.create': { paramsTuple?: []; params?: {} }
    'admin.users.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.roles.index': { paramsTuple?: []; params?: {} }
    'admin.roles.create': { paramsTuple?: []; params?: {} }
    'admin.roles.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.api_tokens.show': { paramsTuple?: []; params?: {} }
    'admin.service_tokens.index': { paramsTuple?: []; params?: {} }
    'admin.api_clients.legacy': { paramsTuple?: []; params?: {} }
    'admin.settings.edit': { paramsTuple?: []; params?: {} }
    'admin.general_settings.edit': { paramsTuple?: []; params?: {} }
    'admin.branding.edit': { paramsTuple?: []; params?: {} }
    'admin.languages_settings.edit': { paramsTuple?: []; params?: {} }
    'admin.account.edit': { paramsTuple?: []; params?: {} }
    'admin.plugins.index': { paramsTuple?: []; params?: {} }
    'admin.audit_logs.index': { paramsTuple?: []; params?: {} }
    'admin.webhooks.index': { paramsTuple?: []; params?: {} }
    'admin.webhooks.create': { paramsTuple?: []; params?: {} }
    'admin.webhooks.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.trash.index': { paramsTuple?: []; params?: {} }
    'admin.trash.show': { paramsTuple: [ParamValue,ParamValue]; params: {'type': ParamValue,'id': ParamValue} }
    'api.site.show': { paramsTuple?: []; params?: {} }
    'api.schema.show': { paramsTuple?: []; params?: {} }
    'api.pages.index': { paramsTuple?: []; params?: {} }
    'api.pages.show': { paramsTuple: [...ParamValue[]]; params: {'*': ParamValue[]} }
    'api.collections.index': { paramsTuple?: []; params?: {} }
    'api.collections.show': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'api.entries.index': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'api.entries.show': { paramsTuple: [ParamValue,ParamValue]; params: {'slug': ParamValue,'entrySlug': ParamValue} }
    'api.globals.index': { paramsTuple?: []; params?: {} }
    'api.globals.show': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'api.redirects.index': { paramsTuple?: []; params?: {} }
    'api.sitemap.show': { paramsTuple?: []; params?: {} }
    'management.api_tokens.me': { paramsTuple?: []; params?: {} }
    'management.service_tokens.index': { paramsTuple?: []; params?: {} }
    'management.service_tokens.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'connect.show': { paramsTuple?: []; params?: {} }
    'admin.forms.index': { paramsTuple?: []; params?: {} }
    'admin.forms.create': { paramsTuple?: []; params?: {} }
    'admin.forms.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.lookups.forms': { paramsTuple?: []; params?: {} }
    'admin.forms.submissions': { paramsTuple: [ParamValue]; params: {'formId': ParamValue} }
    'admin.forms.submissions.export': { paramsTuple: [ParamValue]; params: {'formId': ParamValue} }
    'admin.submissions.index': { paramsTuple?: []; params?: {} }
    'admin.submissions.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.submissions.file': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'field': ParamValue} }
    'admin.settings.forms.edit': { paramsTuple?: []; params?: {} }
    'api.forms.index': { paramsTuple?: []; params?: {} }
    'api.forms.show': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'admin.media.index': { paramsTuple?: []; params?: {} }
    'admin.media.create': { paramsTuple?: []; params?: {} }
    'admin.media.lookup': { paramsTuple?: []; params?: {} }
    'api.assets.index': { paramsTuple?: []; params?: {} }
    'api.assets.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'branding.css': { paramsTuple?: []; params?: {} }
    'health': { paramsTuple?: []; params?: {} }
    'sitemap.show': { paramsTuple?: []; params?: {} }
    'robots.show': { paramsTuple?: []; params?: {} }
    'site.home': { paramsTuple?: []; params?: {} }
    'site.page': { paramsTuple: [...ParamValue[]]; params: {'*': ParamValue[]} }
  }
  HEAD: {
    'drive.fs.serve': { paramsTuple: [...ParamValue[]]; params: {'*': ParamValue[]} }
    'session.create': { paramsTuple?: []; params?: {} }
    'session.challenge': { paramsTuple?: []; params?: {} }
    'signup.create': { paramsTuple?: []; params?: {} }
    'password_reset.create': { paramsTuple?: []; params?: {} }
    'password_reset.edit': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'email_verification.show': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'admin.dashboard.show': { paramsTuple?: []; params?: {} }
    'admin.pages.index': { paramsTuple?: []; params?: {} }
    'admin.pages.create': { paramsTuple?: []; params?: {} }
    'admin.pages.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.page_versions.index': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.page_versions.show': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'versionId': ParamValue} }
    'admin.previews.page': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.page_fields.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.collections.index': { paramsTuple?: []; params?: {} }
    'admin.collections.create': { paramsTuple?: []; params?: {} }
    'admin.collections.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.entries.index': { paramsTuple: [ParamValue]; params: {'collectionId': ParamValue} }
    'admin.entries.create': { paramsTuple: [ParamValue]; params: {'collectionId': ParamValue} }
    'admin.entries.edit': { paramsTuple: [ParamValue,ParamValue]; params: {'collectionId': ParamValue,'id': ParamValue} }
    'admin.entry_versions.index': { paramsTuple: [ParamValue,ParamValue]; params: {'collectionId': ParamValue,'id': ParamValue} }
    'admin.entry_versions.show': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'collectionId': ParamValue,'id': ParamValue,'versionId': ParamValue} }
    'admin.previews.entry': { paramsTuple: [ParamValue,ParamValue]; params: {'collectionId': ParamValue,'id': ParamValue} }
    'admin.globals.index': { paramsTuple?: []; params?: {} }
    'admin.globals.create': { paramsTuple?: []; params?: {} }
    'admin.globals.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.block_types.index': { paramsTuple?: []; params?: {} }
    'admin.block_types.create': { paramsTuple?: []; params?: {} }
    'admin.block_types.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.lookups.pages': { paramsTuple?: []; params?: {} }
    'admin.lookups.entries': { paramsTuple?: []; params?: {} }
    'admin.redirects.index': { paramsTuple?: []; params?: {} }
    'admin.users.index': { paramsTuple?: []; params?: {} }
    'admin.users.create': { paramsTuple?: []; params?: {} }
    'admin.users.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.roles.index': { paramsTuple?: []; params?: {} }
    'admin.roles.create': { paramsTuple?: []; params?: {} }
    'admin.roles.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.api_tokens.show': { paramsTuple?: []; params?: {} }
    'admin.service_tokens.index': { paramsTuple?: []; params?: {} }
    'admin.api_clients.legacy': { paramsTuple?: []; params?: {} }
    'admin.settings.edit': { paramsTuple?: []; params?: {} }
    'admin.general_settings.edit': { paramsTuple?: []; params?: {} }
    'admin.branding.edit': { paramsTuple?: []; params?: {} }
    'admin.languages_settings.edit': { paramsTuple?: []; params?: {} }
    'admin.account.edit': { paramsTuple?: []; params?: {} }
    'admin.plugins.index': { paramsTuple?: []; params?: {} }
    'admin.audit_logs.index': { paramsTuple?: []; params?: {} }
    'admin.webhooks.index': { paramsTuple?: []; params?: {} }
    'admin.webhooks.create': { paramsTuple?: []; params?: {} }
    'admin.webhooks.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.trash.index': { paramsTuple?: []; params?: {} }
    'admin.trash.show': { paramsTuple: [ParamValue,ParamValue]; params: {'type': ParamValue,'id': ParamValue} }
    'api.site.show': { paramsTuple?: []; params?: {} }
    'api.schema.show': { paramsTuple?: []; params?: {} }
    'api.pages.index': { paramsTuple?: []; params?: {} }
    'api.pages.show': { paramsTuple: [...ParamValue[]]; params: {'*': ParamValue[]} }
    'api.collections.index': { paramsTuple?: []; params?: {} }
    'api.collections.show': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'api.entries.index': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'api.entries.show': { paramsTuple: [ParamValue,ParamValue]; params: {'slug': ParamValue,'entrySlug': ParamValue} }
    'api.globals.index': { paramsTuple?: []; params?: {} }
    'api.globals.show': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'api.redirects.index': { paramsTuple?: []; params?: {} }
    'api.sitemap.show': { paramsTuple?: []; params?: {} }
    'management.api_tokens.me': { paramsTuple?: []; params?: {} }
    'management.service_tokens.index': { paramsTuple?: []; params?: {} }
    'management.service_tokens.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'connect.show': { paramsTuple?: []; params?: {} }
    'admin.forms.index': { paramsTuple?: []; params?: {} }
    'admin.forms.create': { paramsTuple?: []; params?: {} }
    'admin.forms.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.lookups.forms': { paramsTuple?: []; params?: {} }
    'admin.forms.submissions': { paramsTuple: [ParamValue]; params: {'formId': ParamValue} }
    'admin.forms.submissions.export': { paramsTuple: [ParamValue]; params: {'formId': ParamValue} }
    'admin.submissions.index': { paramsTuple?: []; params?: {} }
    'admin.submissions.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.submissions.file': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'field': ParamValue} }
    'admin.settings.forms.edit': { paramsTuple?: []; params?: {} }
    'api.forms.index': { paramsTuple?: []; params?: {} }
    'api.forms.show': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'admin.media.index': { paramsTuple?: []; params?: {} }
    'admin.media.create': { paramsTuple?: []; params?: {} }
    'admin.media.lookup': { paramsTuple?: []; params?: {} }
    'api.assets.index': { paramsTuple?: []; params?: {} }
    'api.assets.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'branding.css': { paramsTuple?: []; params?: {} }
    'health': { paramsTuple?: []; params?: {} }
    'sitemap.show': { paramsTuple?: []; params?: {} }
    'robots.show': { paramsTuple?: []; params?: {} }
    'site.home': { paramsTuple?: []; params?: {} }
    'site.page': { paramsTuple: [...ParamValue[]]; params: {'*': ParamValue[]} }
  }
  POST: {
    'session.store': { paramsTuple?: []; params?: {} }
    'session.verify': { paramsTuple?: []; params?: {} }
    'session.cancel': { paramsTuple?: []; params?: {} }
    'signup.store': { paramsTuple?: []; params?: {} }
    'password_reset.store': { paramsTuple?: []; params?: {} }
    'admin.session.destroy': { paramsTuple?: []; params?: {} }
    'admin.pages.bulk': { paramsTuple?: []; params?: {} }
    'admin.pages.store': { paramsTuple?: []; params?: {} }
    'admin.page_publications.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.page_versions.restore': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'versionId': ParamValue} }
    'admin.translations.page': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.taxonomy_pools.pages': { paramsTuple?: []; params?: {} }
    'admin.translations.entry': { paramsTuple: [ParamValue,ParamValue]; params: {'collectionId': ParamValue,'id': ParamValue} }
    'admin.collections.bulk': { paramsTuple?: []; params?: {} }
    'admin.collections.store': { paramsTuple?: []; params?: {} }
    'admin.entries.bulk': { paramsTuple: [ParamValue]; params: {'collectionId': ParamValue} }
    'admin.entries.store': { paramsTuple: [ParamValue]; params: {'collectionId': ParamValue} }
    'admin.entry_publications.store': { paramsTuple: [ParamValue,ParamValue]; params: {'collectionId': ParamValue,'id': ParamValue} }
    'admin.entry_versions.restore': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'collectionId': ParamValue,'id': ParamValue,'versionId': ParamValue} }
    'admin.globals.bulk': { paramsTuple?: []; params?: {} }
    'admin.globals.store': { paramsTuple?: []; params?: {} }
    'admin.block_types.bulk': { paramsTuple?: []; params?: {} }
    'admin.block_types.store': { paramsTuple?: []; params?: {} }
    'admin.block_types.seed': { paramsTuple?: []; params?: {} }
    'admin.markdown_previews.store': { paramsTuple?: []; params?: {} }
    'admin.redirects.bulk': { paramsTuple?: []; params?: {} }
    'admin.redirects.store': { paramsTuple?: []; params?: {} }
    'admin.users.bulk': { paramsTuple?: []; params?: {} }
    'admin.users.store': { paramsTuple?: []; params?: {} }
    'admin.roles.bulk': { paramsTuple?: []; params?: {} }
    'admin.roles.store': { paramsTuple?: []; params?: {} }
    'admin.api_tokens.reveal': { paramsTuple?: []; params?: {} }
    'admin.api_tokens.rotate': { paramsTuple?: []; params?: {} }
    'admin.service_tokens.store': { paramsTuple?: []; params?: {} }
    'admin.service_tokens.reveal': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.service_tokens.rotate': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.service_tokens.revoke': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.account.email_verification': { paramsTuple?: []; params?: {} }
    'admin.two_factor.store': { paramsTuple?: []; params?: {} }
    'admin.two_factor.regenerate': { paramsTuple?: []; params?: {} }
    'admin.webhooks.store': { paramsTuple?: []; params?: {} }
    'admin.webhooks.rotate_secret': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.webhooks.test': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.trash.bulk': { paramsTuple?: []; params?: {} }
    'admin.trash.restore': { paramsTuple: [ParamValue,ParamValue]; params: {'type': ParamValue,'id': ParamValue} }
    'public.device.code': { paramsTuple?: []; params?: {} }
    'public.device.token': { paramsTuple?: []; params?: {} }
    'management.api_tokens.rotate': { paramsTuple?: []; params?: {} }
    'management.service_tokens.store': { paramsTuple?: []; params?: {} }
    'management.service_tokens.reveal': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'management.service_tokens.rotate': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'management.service_tokens.revoke': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'connect.store': { paramsTuple?: []; params?: {} }
    'admin.forms.store': { paramsTuple?: []; params?: {} }
    'admin.forms.duplicate': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.submissions.bulk': { paramsTuple?: []; params?: {} }
    'public.forms.submit': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'admin.media.store': { paramsTuple?: []; params?: {} }
    'admin.media.bulk': { paramsTuple?: []; params?: {} }
    'admin.media.folders.store': { paramsTuple?: []; params?: {} }
  }
  PUT: {
    'password_reset.update': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'admin.pages.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.page_fields.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.collections.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.entries.update': { paramsTuple: [ParamValue,ParamValue]; params: {'collectionId': ParamValue,'id': ParamValue} }
    'admin.globals.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.globals.update_fields': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.block_types.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.redirects.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.users.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.roles.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.settings.update': { paramsTuple?: []; params?: {} }
    'admin.general_settings.update': { paramsTuple?: []; params?: {} }
    'admin.branding.update': { paramsTuple?: []; params?: {} }
    'admin.languages_settings.update': { paramsTuple?: []; params?: {} }
    'admin.brand_brief.update': { paramsTuple?: []; params?: {} }
    'admin.account.update': { paramsTuple?: []; params?: {} }
    'admin.account.email': { paramsTuple?: []; params?: {} }
    'admin.account.password': { paramsTuple?: []; params?: {} }
    'admin.plugins.update': { paramsTuple: [ParamValue]; params: {'key': ParamValue} }
    'admin.webhooks.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.forms.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.submissions.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.settings.forms.update': { paramsTuple?: []; params?: {} }
    'admin.media.folders.update': { paramsTuple?: []; params?: {} }
    'admin.media.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.media.replace': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  DELETE: {
    'admin.pages.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.page_publications.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.collections.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.entries.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'collectionId': ParamValue,'id': ParamValue} }
    'admin.entry_publications.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'collectionId': ParamValue,'id': ParamValue} }
    'admin.globals.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.block_types.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.redirects.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.users.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.roles.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.account.destroy': { paramsTuple?: []; params?: {} }
    'admin.two_factor.destroy': { paramsTuple?: []; params?: {} }
    'admin.account_sessions.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.webhooks.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.trash.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'type': ParamValue,'id': ParamValue} }
    'admin.forms.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.submissions.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.media.folders.destroy': { paramsTuple?: []; params?: {} }
    'admin.media.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}