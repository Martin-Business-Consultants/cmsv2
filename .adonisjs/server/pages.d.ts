import '@adonisjs/inertia/types'

import type React from 'react'
import type { Prettify } from '@adonisjs/core/types/common'

type ExtractProps<T> =
  T extends React.FC<infer Props>
    ? Prettify<Omit<Props, 'children'>>
    : T extends React.Component<infer Props>
      ? Prettify<Omit<Props, 'children'>>
      : never

declare module '@adonisjs/inertia/types' {
  export interface InertiaPages {
    'admin/account': ExtractProps<(typeof import('../../inertia/pages/admin/account.tsx'))['default']>
    'admin/audit_log': ExtractProps<(typeof import('../../inertia/pages/admin/audit_log.tsx'))['default']>
    'admin/block_types/create': ExtractProps<(typeof import('../../inertia/pages/admin/block_types/create.tsx'))['default']>
    'admin/block_types/edit': ExtractProps<(typeof import('../../inertia/pages/admin/block_types/edit.tsx'))['default']>
    'admin/block_types/index': ExtractProps<(typeof import('../../inertia/pages/admin/block_types/index.tsx'))['default']>
    'admin/collections/create': ExtractProps<(typeof import('../../inertia/pages/admin/collections/create.tsx'))['default']>
    'admin/collections/edit': ExtractProps<(typeof import('../../inertia/pages/admin/collections/edit.tsx'))['default']>
    'admin/collections/index': ExtractProps<(typeof import('../../inertia/pages/admin/collections/index.tsx'))['default']>
    'admin/dashboard': ExtractProps<(typeof import('../../inertia/pages/admin/dashboard.tsx'))['default']>
    'admin/entries/create': ExtractProps<(typeof import('../../inertia/pages/admin/entries/create.tsx'))['default']>
    'admin/entries/edit': ExtractProps<(typeof import('../../inertia/pages/admin/entries/edit.tsx'))['default']>
    'admin/entries/index': ExtractProps<(typeof import('../../inertia/pages/admin/entries/index.tsx'))['default']>
    'admin/entries/versions': ExtractProps<(typeof import('../../inertia/pages/admin/entries/versions.tsx'))['default']>
    'admin/globals/create': ExtractProps<(typeof import('../../inertia/pages/admin/globals/create.tsx'))['default']>
    'admin/globals/edit': ExtractProps<(typeof import('../../inertia/pages/admin/globals/edit.tsx'))['default']>
    'admin/globals/index': ExtractProps<(typeof import('../../inertia/pages/admin/globals/index.tsx'))['default']>
    'admin/pages/create': ExtractProps<(typeof import('../../inertia/pages/admin/pages/create.tsx'))['default']>
    'admin/pages/edit': ExtractProps<(typeof import('../../inertia/pages/admin/pages/edit.tsx'))['default']>
    'admin/pages/fields': ExtractProps<(typeof import('../../inertia/pages/admin/pages/fields.tsx'))['default']>
    'admin/pages/index': ExtractProps<(typeof import('../../inertia/pages/admin/pages/index.tsx'))['default']>
    'admin/pages/versions': ExtractProps<(typeof import('../../inertia/pages/admin/pages/versions.tsx'))['default']>
    'admin/plugins/index': ExtractProps<(typeof import('../../inertia/pages/admin/plugins/index.tsx'))['default']>
    'admin/redirects/index': ExtractProps<(typeof import('../../inertia/pages/admin/redirects/index.tsx'))['default']>
    'admin/roles/create': ExtractProps<(typeof import('../../inertia/pages/admin/roles/create.tsx'))['default']>
    'admin/roles/edit': ExtractProps<(typeof import('../../inertia/pages/admin/roles/edit.tsx'))['default']>
    'admin/roles/index': ExtractProps<(typeof import('../../inertia/pages/admin/roles/index.tsx'))['default']>
    'admin/settings/api_token': ExtractProps<(typeof import('../../inertia/pages/admin/settings/api_token.tsx'))['default']>
    'admin/settings/branding': ExtractProps<(typeof import('../../inertia/pages/admin/settings/branding.tsx'))['default']>
    'admin/settings/general': ExtractProps<(typeof import('../../inertia/pages/admin/settings/general.tsx'))['default']>
    'admin/settings/index': ExtractProps<(typeof import('../../inertia/pages/admin/settings/index.tsx'))['default']>
    'admin/settings/languages': ExtractProps<(typeof import('../../inertia/pages/admin/settings/languages.tsx'))['default']>
    'admin/settings/service_tokens': ExtractProps<(typeof import('../../inertia/pages/admin/settings/service_tokens.tsx'))['default']>
    'admin/trash': ExtractProps<(typeof import('../../inertia/pages/admin/trash.tsx'))['default']>
    'admin/users/create': ExtractProps<(typeof import('../../inertia/pages/admin/users/create.tsx'))['default']>
    'admin/users/edit': ExtractProps<(typeof import('../../inertia/pages/admin/users/edit.tsx'))['default']>
    'admin/users/index': ExtractProps<(typeof import('../../inertia/pages/admin/users/index.tsx'))['default']>
    'admin/webhooks/index': ExtractProps<(typeof import('../../inertia/pages/admin/webhooks/index.tsx'))['default']>
    'auth/challenge': ExtractProps<(typeof import('../../inertia/pages/auth/challenge.tsx'))['default']>
    'auth/connect': ExtractProps<(typeof import('../../inertia/pages/auth/connect.tsx'))['default']>
    'auth/forgot_password': ExtractProps<(typeof import('../../inertia/pages/auth/forgot_password.tsx'))['default']>
    'auth/login': ExtractProps<(typeof import('../../inertia/pages/auth/login.tsx'))['default']>
    'auth/reset_password': ExtractProps<(typeof import('../../inertia/pages/auth/reset_password.tsx'))['default']>
    'auth/signup': ExtractProps<(typeof import('../../inertia/pages/auth/signup.tsx'))['default']>
    'errors/not_found': ExtractProps<(typeof import('../../inertia/pages/errors/not_found.tsx'))['default']>
    'errors/server_error': ExtractProps<(typeof import('../../inertia/pages/errors/server_error.tsx'))['default']>
    'site/entry': ExtractProps<(typeof import('../../inertia/pages/site/entry.tsx'))['default']>
    'site/not_found': ExtractProps<(typeof import('../../inertia/pages/site/not_found.tsx'))['default']>
    'site/page': ExtractProps<(typeof import('../../inertia/pages/site/page.tsx'))['default']>
    'admin/pages/version': ExtractProps<(typeof import('../../inertia/pages/admin/pages/version.tsx'))['default']>
    'admin/entries/version': ExtractProps<(typeof import('../../inertia/pages/admin/entries/version.tsx'))['default']>
    'admin/entries/board': ExtractProps<(typeof import('../../inertia/pages/admin/entries/board.tsx'))['default']>
  }
}
