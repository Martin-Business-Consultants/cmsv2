import { client } from '~/client'
import ReactDOMServer from 'react-dom/server'
import { TuyauProvider } from '@adonisjs/inertia/react'
import { createInertiaApp } from '@inertiajs/react'
import { resolvePage } from './resolve_page'

export default function render(page: any) {
  return createInertiaApp({
    page,
    render: ReactDOMServer.renderToString,
    resolve: (name) =>
      resolvePage(name, {
        ...import.meta.glob('./pages/**/*.tsx', { eager: true }),
        ...import.meta.glob('../plugins/*/inertia/pages/**/*.tsx', { eager: true }),
      }),
    setup: ({ App, props }) => {
      return (
        <TuyauProvider client={client}>
          <App {...props} />
        </TuyauProvider>
      )
    },
  })
}
