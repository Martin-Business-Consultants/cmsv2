import type BlockType from '#models/block_type'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class BlockTypeTransformer extends BaseTransformer<BlockType> {
  toObject() {
    return this.pick(this.resource, [
      'id',
      'slug',
      'label',
      'category',
      'description',
      'icon',
      'fields',
      'defaults',
      'deprecated',
      'builtIn',
      'version',
      'createdAt',
      'updatedAt',
    ])
  }
}
