import type Entry from '#models/entry'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class EntryTransformer extends BaseTransformer<Entry> {
  toObject() {
    return this.pick(this.resource, [
      'id',
      'collectionId',
      'locale',
      'categoryEntryId',
      'translationGroupId',
      'title',
      'slug',
      'publicPath',
      'status',
      'isLive',
      'isScheduled',
      'publishAt',
      'unpublishAt',
      'lockVersion',
      'data',
      'body',
      'blocks',
      'seo',
      'publishedAt',
      'deletedAt',
      'createdAt',
      'updatedAt',
    ])
  }

  forList() {
    return this.pick(this.resource, [
      'id',
      'collectionId',
      'locale',
      'title',
      'slug',
      'publicPath',
      'status',
      'isLive',
      'isScheduled',
      'publishAt',
      'unpublishAt',
      'publishedAt',
      'updatedAt',
    ])
  }
}
