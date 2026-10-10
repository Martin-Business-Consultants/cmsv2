import { configApp } from '@adonisjs/eslint-config'
import { react } from '@adonisjs/eslint-config/react'

export default configApp({ ignores: ['database/schema.ts'] }, ...react, {
  files: ['inertia/**/*.{ts,tsx}'],
  rules: {
    '@adonisjs/no-backend-import-in-frontend': ['error', { allowed: ['#types/*'] }],
    'react/no-unknown-property': ['error', { ignore: ['head-key'] }],
  },
})
