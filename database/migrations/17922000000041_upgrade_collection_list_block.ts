import { BaseSchema } from '@adonisjs/lucid/schema'
import { DEFAULT_BLOCK_TYPES } from '#database/data/block_types'

const LEGACY_SORT: Record<string, { sort_by: string; sort_dir: string }> = {
  newest: { sort_by: 'published_at', sort_dir: 'desc' },
  oldest: { sort_by: 'published_at', sort_dir: 'asc' },
  title: { sort_by: 'title', sort_dir: 'asc' },
}

function upgrade(blocks: unknown): { blocks: unknown; changed: boolean } {
  if (!Array.isArray(blocks)) return { blocks, changed: false }
  let changed = false
  const next = blocks.map((block) => {
    if (!block || typeof block !== 'object') return block
    let data = block.data
    if (data && typeof data === 'object') {
      for (const [key, value] of Object.entries(data)) {
        if (Array.isArray(value) && value.some((item) => item?.type && item?.data)) {
          const nested = upgrade(value)
          if (nested.changed) {
            data = { ...data, [key]: nested.blocks }
            changed = true
          }
        }
      }
    }
    if (block.type !== 'collection_list' || !data || 'sort_by' in data) {
      return data === block.data ? block : { ...block, data }
    }
    const { sort, ...rest } = data
    changed = true
    return {
      ...block,
      data: {
        filter_status: 'published',
        ...(LEGACY_SORT[String(sort)] ?? LEGACY_SORT.newest),
        ...rest,
      },
    }
  })
  return { blocks: next, changed }
}

function parse(value: unknown) {
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

export default class extends BaseSchema {
  async up() {
    this.defer(async (db) => {
      const definition = DEFAULT_BLOCK_TYPES.find((type) => type.slug === 'collection_list')!
      await db
        .from('block_types')
        .where('slug', 'collection_list')
        .where('built_in', true)
        .update({
          description: definition.description,
          fields: JSON.stringify(definition.fields),
          defaults: JSON.stringify(definition.defaults),
          version: definition.version ?? 2,
        })
      for (const table of ['pages', 'entries', 'page_versions', 'entry_versions']) {
        const rows = await db
          .from(table)
          .select('id', 'blocks')
          .whereLike('blocks', '%collection_list%')
        for (const row of rows) {
          const { blocks, changed } = upgrade(parse(row.blocks))
          if (changed) {
            await db
              .from(table)
              .where('id', row.id)
              .update({ blocks: JSON.stringify(blocks) })
          }
        }
      }
    })
  }

  async down() {}
}
