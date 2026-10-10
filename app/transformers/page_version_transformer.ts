import type PageVersion from '#models/page_version'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class PageVersionTransformer extends BaseTransformer<PageVersion> {
  toObject() {
    return {
      ...this.pick(this.resource, ['id', 'pageId', 'title', 'createdAt']),
      author: this.resource.user?.displayName ?? null,
    }
  }
}
