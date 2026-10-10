import './css/app.css'
import { client } from './client'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { TuyauProvider } from '@adonisjs/inertia/react'
import { createInertiaApp } from '@inertiajs/react'
import { resolvePage } from './resolve_page'

createInertiaApp({
  title: (title) => title,
  resolve: (name) =>
    resolvePage(name, {
      ...import.meta.glob('./pages/**/*.tsx'),
      ...import.meta.glob('../plugins/*/inertia/pages/**/*.tsx'),
    }),
  setup({ el, App, props }) {
    const app = (
      <TuyauProvider client={client}>
        <App {...props} />
      </TuyauProvider>
    )
    if (el.hasChildNodes()) {
      hydrateRoot(el, app)
    } else {
      createRoot(el).render(app)
    }
  },
  progress: {
    color: '#171717',
  },
})
