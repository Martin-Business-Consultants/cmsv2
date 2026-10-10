import { indexPages } from '@adonisjs/inertia'
import { indexEntities } from '@adonisjs/core/generators'
import { defineConfig } from '@adonisjs/core/app'
import { generateRegistry } from '@tuyau/core/hooks'
import { indexPolicies } from '@adonisjs/bouncer'

export default defineConfig({
  experimental: {},

  commands: [
    () => import('@adonisjs/core/commands'),
    () => import('@adonisjs/lucid/commands'),
    () => import('@adonisjs/session/commands'),
    () => import('@adonisjs/inertia/commands'),
    () => import('@adonisjs/bouncer/commands'),
    () => import('@adonisjs/mail/commands'),
    () => import('@adonisjs/queue/commands'),
  ],

  providers: [
    () => import('@adonisjs/core/providers/app_provider'),
    () => import('@adonisjs/core/providers/hash_provider'),
    {
      file: () => import('@adonisjs/core/providers/repl_provider'),
      environment: ['repl'],
    },
    () => import('@adonisjs/core/providers/vinejs_provider'),
    () => import('@adonisjs/core/providers/edge_provider'),
    () => import('@adonisjs/session/session_provider'),
    () => import('@adonisjs/vite/vite_provider'),
    () => import('@adonisjs/shield/shield_provider'),
    () => import('@adonisjs/static/static_provider'),
    () => import('@adonisjs/lucid/database_provider'),
    () => import('@adonisjs/cors/cors_provider'),
    () => import('@adonisjs/inertia/inertia_provider'),
    () => import('@adonisjs/auth/auth_provider'),
    () => import('#providers/api_provider'),
    () => import('@adonisjs/bouncer/bouncer_provider'),
    () => import('@adonisjs/drive/drive_provider'),
    () => import('@adonisjs/mail/mail_provider'),
    () => import('@adonisjs/limiter/limiter_provider'),
    () => import('@adonisjs/queue/queue_provider'),
    () => import('#providers/jobs_provider'),
  ],

  preloads: [
    () => import('#start/plugins'),
    () => import('#start/routes'),
    () => import('#start/kernel'),
    () => import('#start/validator'),
    () => import('#start/webhooks'),
    () => import('#start/deploys'),
    () => import('#start/hardening'),
    {
      file: () => import('#start/scheduler'),
      environment: ['web'],
    },
  ],

  metaFiles: [
    {
      pattern: 'resources/views/**/*.edge',
      reloadServer: false,
    },
    {
      pattern: 'public/**',
      reloadServer: false,
    },
    {
      pattern: 'pnpm-workspace.yaml',
      reloadServer: false,
    },
  ],

  hooks: {
    init: [
      indexEntities({
        transformers: { enabled: true, withSharedProps: true },
      }),
      indexPages({ framework: 'react' }),
      {
        run(_, __, indexGenerator) {
          indexGenerator.add('pluginPages', {
            source: 'plugins',
            glob: ['**/plugins/*/inertia/pages/**/*.tsx'],
            output: '.adonisjs/server/plugin_pages.d.ts',
            as(vfs, buffer, ___, helpers) {
              const files = vfs.asList()
              buffer.writeLine(`import '@adonisjs/inertia/types'`)
              buffer.writeLine(`import type React from 'react'`)
              buffer.writeLine(`import type { Prettify } from '@adonisjs/core/types/common'`)
              buffer.writeLine(
                `type ExtractPluginProps<T> = T extends React.FC<infer Props> ? Prettify<Omit<Props, 'children'>> : never`
              )
              buffer.write(`declare module '@adonisjs/inertia/types' {`).indent()
              buffer.write(`export interface InertiaPages {`).indent()
              for (const key of Object.keys(files)) {
                const name = key.replace('/inertia/pages/', '/')
                buffer.write(
                  `'${name}': ExtractPluginProps<(typeof import('${helpers.toImportPath(files[key])}'))['default']>`
                )
              }
              buffer.dedent().write(`}`)
              buffer.dedent().write(`}`)
            },
          })
        },
      },
      generateRegistry(),
      indexPolicies(),
    ],
    buildStarting: [() => import('@adonisjs/vite/build_hook')],
  },
})
