import type { HttpContext } from '@adonisjs/core/http'
import { errors } from '@vinejs/vine'
import { DateTime } from 'luxon'
import User from '#models/user'
import UserSession from '#models/user_session'
import { revokeOtherSessions } from '#services/user_sessions'
import Role from '#models/role'
import UserTransformer from '#transformers/user_transformer'
import { createUserValidator, updateUserValidator } from '#validators/user'
import { audit } from '#services/audit'
import { applySearch, applySort, countBy, listParams, paginate } from '#services/listing'

async function roleOptions() {
  const roles = await Role.query().orderBy('name')
  return roles.map((role) => ({
    id: role.id,
    name: role.name,
    description: role.description,
    isAdmin: role.isAdmin,
  }))
}

async function adminCount() {
  const roles = await Role.all()
  const ids = roles.filter((role) => role.isAdmin).map((role) => role.id)
  if (!ids.length) return 0
  const result = await User.query().whereIn('role_id', ids).count('* as total')
  return Number(result[0].$extras.total)
}

function fail(field: string, message: string): never {
  throw new errors.E_VALIDATION_ERROR([{ field, message, rule: 'forbidden' }])
}

async function assertCanAssign(actor: User, roleId: number | null) {
  if (roleId === null) return null
  const role = await Role.findOrFail(roleId)
  if (role.isAdmin && !actor.role?.isAdmin) fail('roleId', 'Only an admin can grant the Admin role')
  return role
}

export default class UsersController {
  async index({ inertia, request, bouncer }: HttpContext) {
    await bouncer.authorize('access', 'users:read')
    const qs = request.qs()
    const list = listParams(qs, {
      sorts: { name: 'full_name', email: 'email', created: 'created_at' },
      sort: 'name',
    })
    const base = User.query()
    const [byRole, roles] = await Promise.all([
      countBy(base, 'role_id'),
      Role.query().orderBy('name'),
    ])
    const role = roles.find((option) => String(option.id) === qs.role)

    const query = applySearch(base.clone(), list.search, ['full_name', 'email'])
    if (role) query.where('role_id', role.id)
    applySort(query, list)
    const { rows, meta } = await paginate(query.preload('role'), list.page)

    return inertia.render('admin/users/index', {
      users: UserTransformer.transform(rows),
      meta,
      roles: roles
        .map((option) => ({ id: option.id, name: option.name, count: byRole[option.id] ?? 0 }))
        .filter((option) => option.count > 0),
      total: Object.values(byRole).reduce((sum, count) => sum + count, 0),
      filters: {
        search: list.search,
        role: role ? String(role.id) : '',
        sort: list.sorted ? list.sort : '',
        order: list.order,
      },
    })
  }

  async create({ inertia, bouncer }: HttpContext) {
    await bouncer.authorize('access', 'users:write')
    return inertia.render('admin/users/create', { roles: await roleOptions() })
  }

  async store(ctx: HttpContext) {
    const { request, response, bouncer, session, auth } = ctx
    await bouncer.authorize('access', 'users:write')
    const values = await request.validateUsing(createUserValidator, { meta: {} })
    await assertCanAssign(auth.use('web').user!, values.roleId)

    const user = await User.create({
      fullName: values.fullName,
      email: values.email,
      roleId: values.roleId,
      password: values.password,
      verifiedAt: values.verified ? DateTime.now() : null,
    })
    await audit(ctx, 'user.created', user, { roleId: user.roleId, verified: user.isVerified })

    session.flash('success', 'User created')
    return response.redirect().toRoute('admin.users.index')
  }

  async edit({ inertia, params, bouncer }: HttpContext) {
    await bouncer.authorize('access', 'users:read')
    const user = await User.query().where('id', params.id).preload('role').firstOrFail()

    return inertia.render('admin/users/edit', {
      editing: UserTransformer.transform(user),
      roles: await roleOptions(),
    })
  }

  async update(ctx: HttpContext) {
    const { request, response, params, bouncer, session, auth } = ctx
    await bouncer.authorize('access', 'users:write')
    const actor = auth.use('web').user!
    const user = await User.query().where('id', params.id).preload('role').firstOrFail()
    if (user.role?.isAdmin && !actor.role?.isAdmin) {
      session.flash('error', 'Only an admin can edit an admin')
      return response.redirect().back()
    }

    const values = await request.validateUsing(updateUserValidator, { meta: { userId: user.id } })
    const role = await assertCanAssign(actor, values.roleId)
    if (user.role?.isAdmin && !role?.isAdmin && (await adminCount()) <= 1) {
      fail('roleId', 'This is the last admin. Make someone else an admin first.')
    }

    const roleChanged = user.roleId !== values.roleId
    const previousRoleId = user.roleId
    const verifiedChanged = values.verified !== undefined && values.verified !== user.isVerified
    if (user.email !== values.email && values.verified === undefined) user.verifiedAt = null
    user.merge({ fullName: values.fullName, email: values.email, roleId: values.roleId })
    if (verifiedChanged) user.verifiedAt = values.verified ? DateTime.now() : null
    if (values.password) user.password = values.password
    await user.save()
    if (values.password && user.id === auth.use('web').user!.id) {
      await revokeOtherSessions(ctx, user)
    } else if (values.password) {
      await UserSession.query().where('user_id', user.id).delete()
    }
    await audit(ctx, 'user.updated', user, {
      ...(roleChanged ? { roleId: values.roleId, previousRoleId } : {}),
      ...(verifiedChanged ? { verified: user.isVerified } : {}),
      ...(values.password ? { passwordChanged: true } : {}),
    })

    session.flash('success', 'User saved')
    return response.redirect().toRoute('admin.users.index')
  }

  async destroy(ctx: HttpContext) {
    const { params, response, bouncer, session, auth } = ctx
    await bouncer.authorize('access', 'users:delete')
    const actor = auth.use('web').user!
    const user = await User.query().where('id', params.id).preload('role').firstOrFail()

    if (user.id === actor.id) {
      session.flash('error', "You can't delete yourself")
      return response.redirect().back()
    }
    if (user.role?.isAdmin) {
      if (!actor.role?.isAdmin) {
        session.flash('error', 'Only an admin can delete an admin')
        return response.redirect().back()
      }
      if ((await adminCount()) <= 1) {
        session.flash('error', "You can't delete the last admin")
        return response.redirect().back()
      }
    }

    await user.delete()
    await audit(ctx, 'user.deleted', user)

    session.flash('success', 'User deleted')
    return response.redirect().toRoute('admin.users.index')
  }
}
