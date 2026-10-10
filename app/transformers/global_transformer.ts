import type Global from '#models/global'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class GlobalTransformer extends BaseTransformer<Global> {
  toObject() {
    return this.pick(this.resource, [
      'id',
      'slug',
      'name',
      'description',
      'icon',
      'lockVersion',
      'fields',
      'data',
      'createdAt',
      'updatedAt',
    ])
  }

  forList() {
    return {
      ...this.pick(this.resource, ['id', 'slug', 'name', 'description', 'icon', 'updatedAt']),
      fieldsCount: this.resource.fields.length,
    }
  }
}
