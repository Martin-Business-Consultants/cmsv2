import { BaseSchema } from '@adonisjs/lucid/schema'

const BUILT_IN = [
  'hero',
  'media_text',
  'feature_grid',
  'stats_section',
  'cta_band',
  'collection_list',
  'text',
  'quote',
  'gallery',
  'divider',
  'contact_info',
  'form',
]

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('block_types', (table) => {
      table.boolean('deprecated').notNullable().defaultTo(false)
      table.boolean('built_in').notNullable().defaultTo(false)
      table.integer('version').unsigned().notNullable().defaultTo(1)
    })

    this.schema.alterTable('pages', (table) => {
      table.json('frontmatter').notNullable().defaultTo('{}')
      table.json('fields').notNullable().defaultTo('[]')
    })

    this.schema.alterTable('page_versions', (table) => {
      table.json('frontmatter').nullable()
    })

    this.schema.alterTable('collections', (table) => {
      table.boolean('enable_blocks').notNullable().defaultTo(false)
      table.boolean('enable_body').notNullable().defaultTo(false)
    })

    this.schema.alterTable('entries', (table) => {
      table.json('body').nullable()
      table.json('blocks').notNullable().defaultTo('[]')
    })

    this.schema.alterTable('entry_versions', (table) => {
      table.json('body').nullable()
      table.json('blocks').nullable()
    })

    this.defer(async (db) => {
      await db.from('block_types').whereIn('slug', BUILT_IN).update({ built_in: true })
    })
  }

  async down() {
    this.schema.alterTable('block_types', (table) => {
      table.dropColumn('deprecated')
      table.dropColumn('built_in')
      table.dropColumn('version')
    })
    this.schema.alterTable('pages', (table) => {
      table.dropColumn('frontmatter')
      table.dropColumn('fields')
    })
    this.schema.alterTable('page_versions', (table) => {
      table.dropColumn('frontmatter')
    })
    this.schema.alterTable('collections', (table) => {
      table.dropColumn('enable_blocks')
      table.dropColumn('enable_body')
    })
    this.schema.alterTable('entries', (table) => {
      table.dropColumn('body')
      table.dropColumn('blocks')
    })
    this.schema.alterTable('entry_versions', (table) => {
      table.dropColumn('body')
      table.dropColumn('blocks')
    })
  }
}
