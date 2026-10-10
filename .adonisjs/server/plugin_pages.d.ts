import '@adonisjs/inertia/types'

import type React from 'react'

import type { Prettify } from '@adonisjs/core/types/common'

type ExtractPluginProps<T> = T extends React.FC<infer Props> ? Prettify<Omit<Props, 'children'>> : never

declare module '@adonisjs/inertia/types' {
  export interface InertiaPages {
    'forms/admin/create': ExtractPluginProps<(typeof import('../../plugins/forms/inertia/pages/admin/create.tsx'))['default']>
    'forms/admin/edit': ExtractPluginProps<(typeof import('../../plugins/forms/inertia/pages/admin/edit.tsx'))['default']>
    'forms/admin/index': ExtractPluginProps<(typeof import('../../plugins/forms/inertia/pages/admin/index.tsx'))['default']>
    'forms/admin/settings': ExtractPluginProps<(typeof import('../../plugins/forms/inertia/pages/admin/settings.tsx'))['default']>
    'forms/admin/submissions': ExtractPluginProps<(typeof import('../../plugins/forms/inertia/pages/admin/submissions.tsx'))['default']>
    'media/admin/create': ExtractPluginProps<(typeof import('../../plugins/media/inertia/pages/admin/create.tsx'))['default']>
    'media/admin/index': ExtractPluginProps<(typeof import('../../plugins/media/inertia/pages/admin/index.tsx'))['default']>
  }
}
