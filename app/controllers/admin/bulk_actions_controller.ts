import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import Page from '#models/page'
import Entry from '#models/entry'
import Collection from '#models/collection'
import Global from '#models/global'
import BlockType from '#models/block_type'
import User from '#models/user'
import Role from '#models/role'
import Redirect from '#models/redirect'
import ServiceToken from '#models/service_token'
import { audit } from '#services/audit'
import { isReferenced } from '#services/references'
import { trashPage } from '#services/page_trash'
import { announce } from '#services/events'
import { bulkValidator } from '#validators/bulk'
import { applyWorkflow, transitionAction } from '#services/publishing'
import type { Status } from '#types/content'

type Outcome = { done: number; skipped: string[] }

const STATUS_ACTIONS: Record<string, { to: Status; verb: string }> = {
  publish: { to: 'published', verb: 'published' },
  unpublish: { to: 'draft', verb: 'unpublished' },
  archive: { to: 'archived', verb: 'archived' },
}

function report(
  { session, response }: HttpContext,
  outcome: Outcome,
  noun: [string, string],
  verb: string
) {
  const { done, skipped } = outcome
  if (done) session.flash('success', `${done} ${done === 1 ? noun[0] : noun[1]} ${verb}`)
  if (skipped.length) {
    const more = skipped.length > 1 ? ` (and ${skipped.length - 1} more)` : ''
    session.flash('error', `${skipped[0]}${more}`)
  } else if (!done) {
    session.flash('error', `No ${noun[1]} changed`)
  }
  return response.redirect().back()
}

function unknownAction({ session, response }: HttpContext) {
  session.flash('error', 'Choose a bulk action')
  return response.redirect().back()
}

async function changeStatus(
  ctx: HttpContext,
  record: Page | Entry,
  to: Status,
  kind: 'page' | 'entry',
  metadata: Record<string, unknown>
) {
  if (record.status === to) return false
  const { from } = applyWorkflow(record, { status: to })
  await record.save()
  const transition = transitionAction(kind, from, to)
  await audit(ctx, transition.action, record, { ...metadata, ...transition.metadata, bulk: true })
  await announce(`${kind}.updated`, record, { from, origin: ctx })
  return true
}

async function adminCount() {
  const roles = await Role.all()
  const ids = roles.filter((role) => role.isAdmin).map((role) => role.id)
  if (!ids.length) return 0
  const result = await User.query().whereIn('role_id', ids).count('* as total')
  return Number(result[0].$extras.total)
}

async function blockTypeInUse(slug: string) {
  return isReferenced('block_type', slug)
}

export default class BulkActionsController {
  async pages(ctx: HttpContext) {
    const { request, bouncer } = ctx
    const { action, ids } = await request.validateUsing(bulkValidator)
    const pages = await Page.query().whereIn('id', ids).whereNull('deleted_at')
    const outcome: Outcome = { done: 0, skipped: [] }

    if (action === 'trash') {
      await bouncer.authorize('access', 'pages:delete')
      for (const page of pages) {
        await page.refresh()
        if (page.deletedAt) continue
        await trashPage(ctx, page, { path: page.path, bulk: true })
        outcome.done++
      }
      return report(ctx, outcome, ['page', 'pages'], 'moved to the trash')
    }
    const change = STATUS_ACTIONS[action]
    if (change) {
      await bouncer.authorize('access', 'pages:publish')
      for (const page of pages) {
        if (await changeStatus(ctx, page, change.to, 'page', { path: page.path })) outcome.done++
      }
      return report(ctx, outcome, ['page', 'pages'], change.verb)
    }
    return unknownAction(ctx)
  }

  async entries(ctx: HttpContext) {
    const { request, bouncer, params } = ctx
    const collection = await Collection.findOrFail(params.collectionId)
    const { action, ids } = await request.validateUsing(bulkValidator)
    const entries = await Entry.query()
      .where('collection_id', collection.id)
      .whereIn('id', ids)
      .whereNull('deleted_at')
    entries.forEach((entry) => entry.$setRelated('collection', collection))
    const noun: [string, string] = [
      collection.singularName.toLowerCase(),
      collection.name.toLowerCase(),
    ]
    const metadata = { collection: collection.slug }
    const outcome: Outcome = { done: 0, skipped: [] }

    if (action === 'trash') {
      await bouncer.authorize('access', 'entries:delete')
      for (const entry of entries) {
        entry.deletedAt = DateTime.now()
        await entry.save()
        await audit(ctx, 'entry.trashed', entry, { ...metadata, bulk: true })
        await announce('entry.trashed', entry, { origin: ctx })
        outcome.done++
      }
      return report(ctx, outcome, noun, 'moved to the trash')
    }
    const change = STATUS_ACTIONS[action]
    if (change) {
      await bouncer.authorize('access', 'entries:publish')
      for (const entry of entries) {
        if (await changeStatus(ctx, entry, change.to, 'entry', metadata)) outcome.done++
      }
      return report(ctx, outcome, noun, change.verb)
    }
    return unknownAction(ctx)
  }

  async collections(ctx: HttpContext) {
    const { request, bouncer } = ctx
    const { action, ids } = await request.validateUsing(bulkValidator)
    if (action !== 'delete') return unknownAction(ctx)
    await bouncer.authorize('access', 'collections:delete')

    const collections = await Collection.query()
      .whereIn('id', ids)
      .withCount('entries', (query) => query.whereNull('deleted_at'))
    const outcome: Outcome = { done: 0, skipped: [] }
    for (const collection of collections) {
      if (Number(collection.$extras.entries_count) > 0) {
        outcome.skipped.push(`${collection.name} still has entries. Move them to the trash first.`)
        continue
      }
      await collection.delete()
      await audit(ctx, 'collection.deleted', collection, { bulk: true })
      outcome.done++
    }
    return report(ctx, outcome, ['collection', 'collections'], 'deleted')
  }

  async globals(ctx: HttpContext) {
    const { request, bouncer } = ctx
    const { action, ids } = await request.validateUsing(bulkValidator)
    if (action !== 'trash') return unknownAction(ctx)
    await bouncer.authorize('access', 'globals:delete')

    const globals = await Global.query().whereIn('id', ids).whereNull('deleted_at')
    const outcome: Outcome = { done: 0, skipped: [] }
    for (const global of globals) {
      await audit(ctx, 'global.deleted', global, { slug: global.slug, bulk: true })
      global.deletedAt = DateTime.now()
      await global.save()
      await announce('global.trashed', global, { origin: ctx })
      outcome.done++
    }
    return report(ctx, outcome, ['global', 'globals'], 'moved to the trash')
  }

  async blockTypes(ctx: HttpContext) {
    const { request, bouncer } = ctx
    const { action, ids } = await request.validateUsing(bulkValidator)
    if (action !== 'delete') return unknownAction(ctx)
    await bouncer.authorize('access', 'block_types:delete')

    const types = await BlockType.query().whereIn('id', ids)
    const outcome: Outcome = { done: 0, skipped: [] }
    for (const type of types) {
      if (await blockTypeInUse(type.slug)) {
        outcome.skipped.push(`${type.label} is still used. Remove it there first.`)
        continue
      }
      await type.delete()
      await audit(ctx, 'block_type.deleted', type, { bulk: true })
      outcome.done++
    }
    return report(ctx, outcome, ['block type', 'block types'], 'deleted')
  }

  async users(ctx: HttpContext) {
    const { request, bouncer, auth } = ctx
    const { action, ids } = await request.validateUsing(bulkValidator)
    if (action !== 'delete') return unknownAction(ctx)
    await bouncer.authorize('access', 'users:delete')

    const actor = auth.use('web').user!
    const users = await User.query().whereIn('id', ids).preload('role')
    const outcome: Outcome = { done: 0, skipped: [] }
    for (const user of users) {
      if (user.id === actor.id) {
        outcome.skipped.push("You can't delete yourself")
        continue
      }
      if (user.role?.isAdmin) {
        if (!actor.role?.isAdmin) {
          outcome.skipped.push('Only an admin can delete an admin')
          continue
        }
        if ((await adminCount()) <= 1) {
          outcome.skipped.push("You can't delete the last admin")
          continue
        }
      }
      await user.delete()
      await audit(ctx, 'user.deleted', user, { bulk: true })
      outcome.done++
    }
    return report(ctx, outcome, ['user', 'users'], 'deleted')
  }

  async roles(ctx: HttpContext) {
    const { request, bouncer } = ctx
    const { action, ids } = await request.validateUsing(bulkValidator)
    if (action !== 'delete') return unknownAction(ctx)
    await bouncer.authorize('access', 'roles:delete')

    const roles = await Role.query().whereIn('id', ids).withCount('users')
    const outcome: Outcome = { done: 0, skipped: [] }
    for (const role of roles) {
      if (role.isSystem || role.isAdmin) {
        outcome.skipped.push(`${role.name} is a system role and can't be deleted`)
        continue
      }
      const clients = await ServiceToken.query().where('role_id', role.id).count('* as total')
      if (Number(role.$extras.users_count) + Number(clients[0].$extras.total) > 0) {
        outcome.skipped.push(`${role.name} is still assigned to users or service tokens`)
        continue
      }
      await role.delete()
      await audit(ctx, 'role.deleted', role, { bulk: true })
      outcome.done++
    }
    return report(ctx, outcome, ['role', 'roles'], 'deleted')
  }

  async redirects(ctx: HttpContext) {
    const { request, bouncer } = ctx
    const { action, ids } = await request.validateUsing(bulkValidator)
    const redirects = await Redirect.query().whereIn('id', ids)
    const outcome: Outcome = { done: 0, skipped: [] }

    if (action === 'delete') {
      await bouncer.authorize('access', 'redirects:delete')
      for (const redirect of redirects) {
        await redirect.delete()
        await audit(ctx, 'redirect.deleted', redirect, { bulk: true })
        outcome.done++
      }
      return report(ctx, outcome, ['redirect', 'redirects'], 'deleted')
    }
    if (action === 'activate' || action === 'deactivate') {
      await bouncer.authorize('access', 'redirects:write')
      const isActive = action === 'activate'
      for (const redirect of redirects) {
        if (redirect.isActive === isActive) continue
        redirect.isActive = isActive
        await redirect.save()
        await audit(ctx, 'redirect.updated', redirect, { isActive, bulk: true })
        outcome.done++
      }
      return report(ctx, outcome, ['redirect', 'redirects'], `${action}d`)
    }
    return unknownAction(ctx)
  }
}
