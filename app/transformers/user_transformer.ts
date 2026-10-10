import type User from '#models/user'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class UserTransformer extends BaseTransformer<User> {
  toObject() {
    return {
      ...this.pick(this.resource, [
        'id',
        'fullName',
        'email',
        'displayName',
        'initials',
        'roleId',
        'createdAt',
      ]),
      roleName: this.resource.role?.name ?? null,
      verified: this.resource.isVerified,
    }
  }

  forSession() {
    return {
      ...this.pick(this.resource, ['id', 'fullName', 'email', 'displayName', 'initials']),
      roleName: this.resource.role?.name ?? null,
      capabilities: this.resource.capabilities,
    }
  }
}
