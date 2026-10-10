/* eslint-disable prettier/prettier */
import type { routes } from './index.ts'

export interface ApiDefinition {
  drive: {
    fs: {
      serve: typeof routes['drive.fs.serve']
    }
  }
  session: {
    create: typeof routes['session.create']
    store: typeof routes['session.store']
    challenge: typeof routes['session.challenge']
    verify: typeof routes['session.verify']
    cancel: typeof routes['session.cancel']
  }
  signup: {
    create: typeof routes['signup.create']
    store: typeof routes['signup.store']
  }
  passwordReset: {
    create: typeof routes['password_reset.create']
    store: typeof routes['password_reset.store']
    edit: typeof routes['password_reset.edit']
    update: typeof routes['password_reset.update']
  }
  emailVerification: {
    show: typeof routes['email_verification.show']
  }
  admin: {
    session: {
      destroy: typeof routes['admin.session.destroy']
    }
    dashboard: {
      show: typeof routes['admin.dashboard.show']
    }
    pages: {
      index: typeof routes['admin.pages.index']
      bulk: typeof routes['admin.pages.bulk']
      create: typeof routes['admin.pages.create']
      store: typeof routes['admin.pages.store']
      edit: typeof routes['admin.pages.edit']
      update: typeof routes['admin.pages.update']
      destroy: typeof routes['admin.pages.destroy']
    }
    pagePublications: {
      store: typeof routes['admin.page_publications.store']
      destroy: typeof routes['admin.page_publications.destroy']
    }
    pageVersions: {
      index: typeof routes['admin.page_versions.index']
      show: typeof routes['admin.page_versions.show']
      restore: typeof routes['admin.page_versions.restore']
    }
    previews: {
      page: typeof routes['admin.previews.page']
      entry: typeof routes['admin.previews.entry']
    }
    pageFields: {
      show: typeof routes['admin.page_fields.show']
      update: typeof routes['admin.page_fields.update']
    }
    translations: {
      page: typeof routes['admin.translations.page']
      entry: typeof routes['admin.translations.entry']
    }
    taxonomyPools: {
      pages: typeof routes['admin.taxonomy_pools.pages']
    }
    collections: {
      index: typeof routes['admin.collections.index']
      bulk: typeof routes['admin.collections.bulk']
      create: typeof routes['admin.collections.create']
      store: typeof routes['admin.collections.store']
      edit: typeof routes['admin.collections.edit']
      update: typeof routes['admin.collections.update']
      destroy: typeof routes['admin.collections.destroy']
    }
    entries: {
      index: typeof routes['admin.entries.index']
      bulk: typeof routes['admin.entries.bulk']
      create: typeof routes['admin.entries.create']
      store: typeof routes['admin.entries.store']
      edit: typeof routes['admin.entries.edit']
      update: typeof routes['admin.entries.update']
      destroy: typeof routes['admin.entries.destroy']
    }
    entryPublications: {
      store: typeof routes['admin.entry_publications.store']
      destroy: typeof routes['admin.entry_publications.destroy']
    }
    entryVersions: {
      index: typeof routes['admin.entry_versions.index']
      show: typeof routes['admin.entry_versions.show']
      restore: typeof routes['admin.entry_versions.restore']
    }
    globals: {
      index: typeof routes['admin.globals.index']
      bulk: typeof routes['admin.globals.bulk']
      create: typeof routes['admin.globals.create']
      store: typeof routes['admin.globals.store']
      edit: typeof routes['admin.globals.edit']
      update: typeof routes['admin.globals.update']
      updateFields: typeof routes['admin.globals.update_fields']
      destroy: typeof routes['admin.globals.destroy']
    }
    blockTypes: {
      index: typeof routes['admin.block_types.index']
      bulk: typeof routes['admin.block_types.bulk']
      create: typeof routes['admin.block_types.create']
      store: typeof routes['admin.block_types.store']
      seed: typeof routes['admin.block_types.seed']
      edit: typeof routes['admin.block_types.edit']
      update: typeof routes['admin.block_types.update']
      destroy: typeof routes['admin.block_types.destroy']
    }
    lookups: {
      pages: typeof routes['admin.lookups.pages']
      entries: typeof routes['admin.lookups.entries']
      forms: typeof routes['admin.lookups.forms']
    }
    markdownPreviews: {
      store: typeof routes['admin.markdown_previews.store']
    }
    redirects: {
      index: typeof routes['admin.redirects.index']
      bulk: typeof routes['admin.redirects.bulk']
      store: typeof routes['admin.redirects.store']
      update: typeof routes['admin.redirects.update']
      destroy: typeof routes['admin.redirects.destroy']
    }
    users: {
      index: typeof routes['admin.users.index']
      bulk: typeof routes['admin.users.bulk']
      create: typeof routes['admin.users.create']
      store: typeof routes['admin.users.store']
      edit: typeof routes['admin.users.edit']
      update: typeof routes['admin.users.update']
      destroy: typeof routes['admin.users.destroy']
    }
    roles: {
      index: typeof routes['admin.roles.index']
      bulk: typeof routes['admin.roles.bulk']
      create: typeof routes['admin.roles.create']
      store: typeof routes['admin.roles.store']
      edit: typeof routes['admin.roles.edit']
      update: typeof routes['admin.roles.update']
      destroy: typeof routes['admin.roles.destroy']
    }
    apiTokens: {
      show: typeof routes['admin.api_tokens.show']
      reveal: typeof routes['admin.api_tokens.reveal']
      rotate: typeof routes['admin.api_tokens.rotate']
    }
    serviceTokens: {
      index: typeof routes['admin.service_tokens.index']
      store: typeof routes['admin.service_tokens.store']
      reveal: typeof routes['admin.service_tokens.reveal']
      rotate: typeof routes['admin.service_tokens.rotate']
      revoke: typeof routes['admin.service_tokens.revoke']
    }
    apiClients: {
      legacy: typeof routes['admin.api_clients.legacy']
    }
    settings: {
      edit: typeof routes['admin.settings.edit']
      update: typeof routes['admin.settings.update']
      forms: {
        edit: typeof routes['admin.settings.forms.edit']
        update: typeof routes['admin.settings.forms.update']
      }
    }
    generalSettings: {
      edit: typeof routes['admin.general_settings.edit']
      update: typeof routes['admin.general_settings.update']
    }
    branding: {
      edit: typeof routes['admin.branding.edit']
      update: typeof routes['admin.branding.update']
    }
    languagesSettings: {
      edit: typeof routes['admin.languages_settings.edit']
      update: typeof routes['admin.languages_settings.update']
    }
    brandBrief: {
      update: typeof routes['admin.brand_brief.update']
    }
    account: {
      edit: typeof routes['admin.account.edit']
      update: typeof routes['admin.account.update']
      email: typeof routes['admin.account.email']
      password: typeof routes['admin.account.password']
      destroy: typeof routes['admin.account.destroy']
      emailVerification: typeof routes['admin.account.email_verification']
    }
    twoFactor: {
      store: typeof routes['admin.two_factor.store']
      regenerate: typeof routes['admin.two_factor.regenerate']
      destroy: typeof routes['admin.two_factor.destroy']
    }
    accountSessions: {
      destroy: typeof routes['admin.account_sessions.destroy']
    }
    plugins: {
      index: typeof routes['admin.plugins.index']
      update: typeof routes['admin.plugins.update']
    }
    auditLogs: {
      index: typeof routes['admin.audit_logs.index']
    }
    webhooks: {
      index: typeof routes['admin.webhooks.index']
      create: typeof routes['admin.webhooks.create']
      store: typeof routes['admin.webhooks.store']
      edit: typeof routes['admin.webhooks.edit']
      update: typeof routes['admin.webhooks.update']
      destroy: typeof routes['admin.webhooks.destroy']
      rotateSecret: typeof routes['admin.webhooks.rotate_secret']
      test: typeof routes['admin.webhooks.test']
    }
    trash: {
      index: typeof routes['admin.trash.index']
      bulk: typeof routes['admin.trash.bulk']
      show: typeof routes['admin.trash.show']
      restore: typeof routes['admin.trash.restore']
      destroy: typeof routes['admin.trash.destroy']
    }
    forms: {
      index: typeof routes['admin.forms.index']
      create: typeof routes['admin.forms.create']
      store: typeof routes['admin.forms.store']
      edit: typeof routes['admin.forms.edit']
      update: typeof routes['admin.forms.update']
      duplicate: typeof routes['admin.forms.duplicate']
      destroy: typeof routes['admin.forms.destroy']
      submissions: typeof routes['admin.forms.submissions'] & {
        export: typeof routes['admin.forms.submissions.export']
      }
    }
    submissions: {
      index: typeof routes['admin.submissions.index']
      bulk: typeof routes['admin.submissions.bulk']
      show: typeof routes['admin.submissions.show']
      update: typeof routes['admin.submissions.update']
      destroy: typeof routes['admin.submissions.destroy']
      file: typeof routes['admin.submissions.file']
    }
    media: {
      index: typeof routes['admin.media.index']
      create: typeof routes['admin.media.create']
      lookup: typeof routes['admin.media.lookup']
      store: typeof routes['admin.media.store']
      bulk: typeof routes['admin.media.bulk']
      folders: {
        store: typeof routes['admin.media.folders.store']
        update: typeof routes['admin.media.folders.update']
        destroy: typeof routes['admin.media.folders.destroy']
      }
      update: typeof routes['admin.media.update']
      replace: typeof routes['admin.media.replace']
      destroy: typeof routes['admin.media.destroy']
    }
  }
  api: {
    site: {
      show: typeof routes['api.site.show']
    }
    schema: {
      show: typeof routes['api.schema.show']
    }
    pages: {
      index: typeof routes['api.pages.index']
      show: typeof routes['api.pages.show']
    }
    collections: {
      index: typeof routes['api.collections.index']
      show: typeof routes['api.collections.show']
    }
    entries: {
      index: typeof routes['api.entries.index']
      show: typeof routes['api.entries.show']
    }
    globals: {
      index: typeof routes['api.globals.index']
      show: typeof routes['api.globals.show']
    }
    redirects: {
      index: typeof routes['api.redirects.index']
    }
    sitemap: {
      show: typeof routes['api.sitemap.show']
    }
    forms: {
      index: typeof routes['api.forms.index']
      show: typeof routes['api.forms.show']
    }
    assets: {
      index: typeof routes['api.assets.index']
      show: typeof routes['api.assets.show']
    }
  }
  public: {
    device: {
      code: typeof routes['public.device.code']
      token: typeof routes['public.device.token']
    }
    forms: {
      submit: typeof routes['public.forms.submit']
    }
  }
  management: {
    apiTokens: {
      me: typeof routes['management.api_tokens.me']
      rotate: typeof routes['management.api_tokens.rotate']
    }
    serviceTokens: {
      index: typeof routes['management.service_tokens.index']
      store: typeof routes['management.service_tokens.store']
      show: typeof routes['management.service_tokens.show']
      reveal: typeof routes['management.service_tokens.reveal']
      rotate: typeof routes['management.service_tokens.rotate']
      revoke: typeof routes['management.service_tokens.revoke']
    }
  }
  connect: {
    show: typeof routes['connect.show']
    store: typeof routes['connect.store']
  }
  branding: {
    css: typeof routes['branding.css']
  }
  health: typeof routes['health']
  sitemap: {
    show: typeof routes['sitemap.show']
  }
  robots: {
    show: typeof routes['robots.show']
  }
  site: {
    home: typeof routes['site.home']
    page: typeof routes['site.page']
  }
}
