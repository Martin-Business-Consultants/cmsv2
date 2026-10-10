import type Collection from '#models/collection'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class CollectionTransformer extends BaseTransformer<Collection> {
  toObject() {
    return {
      ...this.pick(this.resource, [
        'id',
        'slug',
        'name',
        'singularName',
        'description',
        'icon',
        'urlPrefix',
        'fields',
        'enableBlocks',
        'enableBody',
        'categoriesCollectionId',
        'tagsCollectionId',
        'buildConfig',
        'notificationEvents',
        'notificationEmails',
        'createdAt',
        'updatedAt',
      ]),
      entriesCount: Number(this.resource.$extras.entries_count ?? 0),
    }
  }
}
