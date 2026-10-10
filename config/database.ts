import { existsSync, readdirSync } from 'node:fs'
import app from '@adonisjs/core/services/app'
import { defineConfig } from '@adonisjs/lucid'

const pluginMigrations = existsSync(app.makePath('plugins'))
  ? readdirSync(app.makePath('plugins'))
      .map((plugin) => `plugins/${plugin}/database/migrations`)
      .filter((path) => existsSync(app.makePath(path)))
  : []

const dbConfig = defineConfig({
  connection: 'sqlite',
  connections: {
    sqlite: {
      client: 'better-sqlite3',
      connection: {
        filename: app.makePath('storage/db.sqlite3'),
      },
      useNullAsDefault: true,
      migrations: {
        naturalSort: true,
        paths: ['database/migrations', ...pluginMigrations],
      },
      schemaGeneration: {
        enabled: true,
        rulesPaths: ['./database/schema_rules.js'],
        excludeTables: [
          'search_index',
          'search_index_config',
          'search_index_content',
          'search_index_data',
          'search_index_docsize',
          'search_index_idx',
        ],
      },
    },
  },
})

export default dbConfig
