import { BaseTransformer } from '@adonisjs/core/transformers'
import type Asset from '../models/asset.js'

export default class AssetTransformer extends BaseTransformer<Asset> {
  toObject() {
    return this.pick(this.resource, [
      'id',
      'filename',
      'title',
      'displayTitle',
      'url',
      'srcset',
      'mimeType',
      'isImage',
      'size',
      'width',
      'height',
      'alt',
      'caption',
      'description',
      'folder',
      'focalX',
      'focalY',
      'createdAt',
      'updatedAt',
    ])
  }
}
