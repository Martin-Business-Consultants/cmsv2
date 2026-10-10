import Asset from '../models/asset.js'
import BlockType from '#models/block_type'
import Entry from '#models/entry'
import Global from '#models/global'
import Page from '#models/page'
import type { Block, Field, FieldData } from '#types/content'

export type AssetUsage = { kind: 'page' | 'entry' | 'global'; label: string; href: string }

type Found = { ids: Set<number>; text: string }

function collectFields(
  fields: Field[],
  data: FieldData | undefined,
  blockTypes: Map<string, Field[]>,
  out: Set<number>
) {
  if (!data || typeof data !== 'object') return
  for (const field of fields) {
    const value = data[field.name]
    if (field.type === 'asset' && Number.isInteger(value)) out.add(value)
    if (field.type === 'group') collectFields(field.of ?? [], value, blockTypes, out)
    if (field.type === 'repeater' && Array.isArray(value)) {
      for (const item of value) collectFields(field.of ?? [], item, blockTypes, out)
    }
    if (field.type === 'blocks' && Array.isArray(value)) collectBlocks(value, blockTypes, out)
  }
}

function collectBlocks(blocks: Block[], blockTypes: Map<string, Field[]>, out: Set<number>) {
  for (const block of blocks ?? []) {
    const fields = blockTypes.get(block?.type)
    if (fields) collectFields(fields, block.data, blockTypes, out)
  }
}

function uses(found: Found, asset: Asset, seoImageId?: number | null) {
  return found.ids.has(asset.id) || seoImageId === asset.id || found.text.includes(asset.url)
}

function mentions(
  query: { orWhereLike(column: string, pattern: string): unknown },
  columns: string[],
  patterns: string[]
) {
  for (const column of columns) {
    for (const pattern of patterns) query.orWhereLike(column, pattern)
  }
}

async function blockTypeFields() {
  const types = await BlockType.all()
  return new Map(types.map((type) => [type.slug, type.fields]))
}

export async function assetUsage(asset: Asset): Promise<AssetUsage[]> {
  const blockTypes = await blockTypeFields()
  const usage: AssetUsage[] = []
  const patterns = [`%${asset.id}%`, `%${asset.key}%`]

  const pages = await Page.query()
    .whereNull('deleted_at')
    .where((query) => mentions(query, ['blocks', 'seo'], patterns))
    .orderBy('path')
  for (const page of pages) {
    const found: Found = { ids: new Set(), text: JSON.stringify(page.blocks) }
    collectBlocks(page.blocks, blockTypes, found.ids)
    if (uses(found, asset, page.seo?.imageId)) {
      usage.push({ kind: 'page', label: page.title, href: `/admin/pages/${page.id}/edit` })
    }
  }

  const entries = await Entry.query()
    .whereNull('deleted_at')
    .where((query) => mentions(query, ['data', 'seo'], patterns))
    .preload('collection')
    .orderBy('title')
  for (const entry of entries) {
    const found: Found = { ids: new Set(), text: JSON.stringify(entry.data) }
    collectFields(entry.collection.fields, entry.data, blockTypes, found.ids)
    if (uses(found, asset, entry.seo?.imageId)) {
      usage.push({
        kind: 'entry',
        label: `${entry.title} (${entry.collection.name})`,
        href: `/admin/collections/${entry.collectionId}/entries/${entry.id}/edit`,
      })
    }
  }

  const globals = await Global.query()
    .where((query) => mentions(query, ['data'], patterns))
    .orderBy('name')
  for (const global of globals) {
    const found: Found = { ids: new Set(), text: JSON.stringify(global.data) }
    collectFields(global.fields, global.data, blockTypes, found.ids)
    if (uses(found, asset)) {
      usage.push({ kind: 'global', label: global.name, href: `/admin/globals/${global.id}/edit` })
    }
  }

  return usage
}

export async function usedAssetIds() {
  const blockTypes = await blockTypeFields()
  const ids = new Set<number>()
  for (const page of await Page.query().whereNull('deleted_at')) {
    collectBlocks(page.blocks, blockTypes, ids)
    if (page.seo?.imageId) ids.add(page.seo.imageId)
  }
  for (const entry of await Entry.query().whereNull('deleted_at').preload('collection')) {
    collectFields(entry.collection.fields, entry.data, blockTypes, ids)
    if (entry.seo?.imageId) ids.add(entry.seo.imageId)
  }
  for (const global of await Global.all())
    collectFields(global.fields, global.data, blockTypes, ids)
  return ids
}

export async function imagesWithoutAlt() {
  const images = await Asset.query()
    .apply((scopes) => scopes.active())
    .whereLike('mime_type', 'image/%')
    .where((query) => query.whereNull('alt').orWhere('alt', ''))
    .orderBy('created_at', 'desc')
  const used = await usedAssetIds()
  return { images, inUse: images.filter((image) => used.has(image.id)) }
}
