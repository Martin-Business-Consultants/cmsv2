import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import Role from '#models/role'
import ServiceToken from '#models/service_token'
import RoleTransformer from '#transformers/role_transformer'
import { roleValidator } from '#validators/role'
import { audit } from '#services/audit'
import { applySearch, applySort, countBy, listParams, paginate } from '#services/listing'
import { plugins } from '#services/plugins'

const capabilityGroups = () => plugins.permissionCatalog()

async function findEditable(id: number | string) {
  const role = await Role.findOrFail(id)
  return role.isSystem || role.isAdmin ? null : role
}

export default class RolesController {
  async index({ inertia, request, bouncer }: HttpContext) {
    await bouncer.authorize('access', 'roles:read')
    const qs = request.qs()
    const list = listParams(qs, {
      sorts: { name: 'name', users: 'users_count' },
      sort: 'name',
    })
    const type = qs.type === 'system' || qs.type === 'custom' ? String(qs.type) : ''
    const base = Role.query()
    const query = applySearch(base.clone(), list.search, ['roles.name', 'roles.description'])
      .select('roles.*')
      .withCount('users')
      .select(
        db
          .from('service_tokens')
          .count('*')
          .whereColumn('service_tokens.role_id', 'roles.id')
          .as('service_tokens_count')
      )
    if (type) query.where('is_system', type === 'system')
    if (!list.sorted) query.orderBy('is_system', 'desc')
    applySort(query, list)
    const [{ rows, meta }, byType] = await Promise.all([
      paginate(query, list.page),
      countBy(base, 'is_system'),
    ])
    const system = (byType['1'] ?? 0) + (byType['true'] ?? 0)
    const custom = (byType['0'] ?? 0) + (byType['false'] ?? 0)

    return inertia.render('admin/roles/index', {
      roles: RoleTransformer.transform(rows).useVariant('forList'),
      meta,
      counts: { all: system + custom, system, custom },
      filters: {
        search: list.search,
        type,
        sort: list.sorted ? list.sort : '',
        order: list.order,
      },
    })
  }

  async create({ inertia, bouncer }: HttpContext) {
    await bouncer.authorize('access', 'roles:write')
    return inertia.render('admin/roles/create', { capabilities: capabilityGroups() })
  }

  async store(ctx: HttpContext) {
    const { request, response, bouncer, session } = ctx
    await bouncer.authorize('access', 'roles:write')
    const values = await request.validateUsing(roleValidator, { meta: {} })

    const role = await Role.create({
      name: values.name,
      description: values.description ?? null,
      permissions: values.permissions,
      isSystem: false,
    })
    await audit(ctx, 'role.created', role, { permissions: role.permissions })

    session.flash('success', 'Role created')
    return response.redirect().toRoute('admin.roles.index')
  }

  async edit({ inertia, params, bouncer }: HttpContext) {
    await bouncer.authorize('access', 'roles:read')
    const role = await Role.findOrFail(params.id)

    return inertia.render('admin/roles/edit', {
      role: RoleTransformer.transform(role),
      capabilities: capabilityGroups(),
    })
  }

  async update(ctx: HttpContext) {
    const { request, response, params, bouncer, session } = ctx
    await bouncer.authorize('access', 'roles:write')
    const role = await findEditable(params.id)
    if (!role) {
      session.flash('error', "System roles can't be edited")
      return response.redirect().back()
    }

    const values = await request.validateUsing(roleValidator, { meta: { roleId: role.id } })
    const before = role.permissions
    role.merge({
      name: values.name,
      description: values.description ?? null,
      permissions: values.permissions,
    })
    await role.save()
    await audit(ctx, 'role.updated', role, {
      added: values.permissions.filter((permission) => !before.includes(permission)),
      removed: before.filter((permission) => !values.permissions.includes(permission as never)),
    })

    session.flash('success', 'Role saved')
    return response.redirect().toRoute('admin.roles.index')
  }

  async destroy(ctx: HttpContext) {
    const { params, response, bouncer, session } = ctx
    await bouncer.authorize('access', 'roles:delete')
    const role = await findEditable(params.id)
    if (!role) {
      session.flash('error', "System roles can't be deleted")
      return response.redirect().back()
    }

    const users = await role.related('users').query().count('* as total')
    const clients = await ServiceToken.query().where('role_id', role.id).count('* as total')
    const inUse = Number(users[0].$extras.total) + Number(clients[0].$extras.total)
    if (inUse > 0) {
      session.flash(
        'error',
        'This role is still assigned to users or service tokens. Reassign them first.'
      )
      return response.redirect().back()
    }

    await role.delete()
    await audit(ctx, 'role.deleted', role)

    session.flash('success', 'Role deleted')
    return response.redirect().toRoute('admin.roles.index')
  }
}
