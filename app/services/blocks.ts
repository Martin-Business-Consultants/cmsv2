import BlockType from '#models/block_type'
import Collection from '#models/collection'
import BlockTypeTransformer from '#transformers/block_type_transformer'
import type { BlockTypeLookup } from '#services/fields'
import type { CollectionOption } from '#types/content'

export async function blockTypeLookup(): Promise<BlockTypeLookup> {
  const types = await BlockType.all()
  return new Map(
    types.map((type) => [
      type.slug,
      { fields: type.fields, label: type.label, version: type.version },
    ])
  )
}

export async function editorProps() {
  const [blockTypes, collections] = await Promise.all([
    BlockType.query().orderBy('category').orderBy('label'),
    Collection.query().orderBy('name'),
  ])
  return {
    blockTypes: BlockTypeTransformer.transform(blockTypes),
    collections: collections.map((collection): CollectionOption => ({
      slug: collection.slug,
      name: collection.name,
    })),
  }
}
