import type EntryVersion from '#models/entry_version'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class EntryVersionTransformer extends BaseTransformer<EntryVersion> {
  toObject() {
    return {
      ...this.pick(this.resource, ['id', 'entryId', 'title', 'createdAt']),
      author: this.resource.user?.displayName ?? null,
    }
  }
}
