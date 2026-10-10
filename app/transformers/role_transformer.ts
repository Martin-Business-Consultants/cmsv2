import type Role from '#models/role'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class RoleTransformer extends BaseTransformer<Role> {
  toObject() {
    return this.pick(this.resource, [
      'id',
      'name',
      'description',
      'permissions',
      'isSystem',
      'isAdmin',
      'createdAt',
      'updatedAt',
    ])
  }

  forList() {
    return {
      ...this.pick(this.resource, [
        'id',
        'name',
        'description',
        'permissions',
        'isSystem',
        'isAdmin',
      ]),
      usersCount: Number(this.resource.$extras.users_count ?? 0),
      serviceTokensCount: Number(this.resource.$extras.service_tokens_count ?? 0),
    }
  }
}
