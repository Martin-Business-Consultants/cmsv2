import { defineConfig } from '@adonisjs/inertia'

const inertiaConfig = defineConfig({
  ssr: {
    enabled: true,
    pages: (_, page) => page.startsWith('site/') || /^[a-z][a-z0-9_]*\/site\//.test(page),
    entrypoint: 'inertia/ssr.tsx',
  },
})

export default inertiaConfig
