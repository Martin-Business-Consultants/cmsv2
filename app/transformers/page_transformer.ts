import type Page from '#models/page'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class PageTransformer extends BaseTransformer<Page> {
  toObject() {
    return this.pick(this.resource, [
      'id',
      'parentId',
      'locale',
      'categoryEntryId',
      'translationGroupId',
      'title',
      'slug',
      'path',
      'publicPath',
      'status',
      'isLive',
      'isScheduled',
      'publishAt',
      'unpublishAt',
      'lockVersion',
      'blocks',
      'frontmatter',
      'fields',
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
      'parentId',
      'locale',
      'title',
      'slug',
      'path',
      'publicPath',
      'status',
      'isLive',
      'isScheduled',
      'publishAt',
      'unpublishAt',
      'publishedAt',
      'deletedAt',
      'updatedAt',
    ])
  }
}
