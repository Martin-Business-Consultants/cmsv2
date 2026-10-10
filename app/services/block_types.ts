import BlockType from '#models/block_type'
import { plugins } from '#services/plugins'
import { STARTER_BLOCK_TYPES } from '#database/data/block_types'
import { assertValid, validateData, validateDefinitions } from '#services/fields'
import { blockTypeLookup } from '#services/blocks'
import type { BlockTypeOption, Field, FieldData } from '#types/content'

export function starterPack(): BlockTypeOption[] {
  return [
    ...STARTER_BLOCK_TYPES,
    ...plugins.enabled(plugins.blockTypePacks).flatMap((pack) => pack.types),
  ]
}

async function existingSlugs() {
  const rows = await BlockType.query().select('slug')
  return new Set(rows.map((row) => row.slug))
}

export async function missingStarterTypes() {
  const existing = await existingSlugs()
  return starterPack().filter((type) => !existing.has(type.slug))
}

export async function installBlockTypes(types: BlockTypeOption[]) {
  const existing = await existingSlugs()
  const installed: string[] = []
  for (const type of types) {
    if (existing.has(type.slug)) continue
    await BlockType.create({
      slug: type.slug,
      label: type.label,
      category: type.category ?? null,
      description: type.description ?? null,
      icon: type.icon ?? null,
      fields: type.fields,
      defaults: type.defaults ?? {},
      deprecated: type.deprecated ?? false,
      builtIn: true,
      version: type.version ?? 1,
    })
    existing.add(type.slug)
    installed.push(type.slug)
  }
  return installed
}

export async function installStarterPack() {
  return installBlockTypes(starterPack())
}

export async function checkBlockTypeSchema(
  slug: string,
  label: string,
  fields: Field[],
  defaults: FieldData
) {
  assertValid(validateDefinitions(fields))
  const lookup = await blockTypeLookup()
  lookup.set(slug, { fields, label })
  const names = new Set(fields.map((field) => field.name))
  const pruned = Object.fromEntries(Object.entries(defaults).filter(([key]) => names.has(key)))
  assertValid(
    validateData(fields, pruned, lookup, 'defaults').filter((error) => error.rule !== 'required')
  )
  return pruned
}
