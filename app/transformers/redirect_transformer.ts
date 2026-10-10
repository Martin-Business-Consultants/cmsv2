import type Redirect from '#models/redirect'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class RedirectTransformer extends BaseTransformer<Redirect> {
  toObject() {
    return this.pick(this.resource, [
      'id',
      'source',
      'destination',
      'statusCode',
      'isActive',
      'hits',
      'lastHitAt',
      'notes',
      'createdAt',
      'updatedAt',
    ])
  }
}
