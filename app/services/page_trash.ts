import { DateTime } from 'luxon'
import Page from '#models/page'
import { audit, type OriginSource } from '#services/audit'
import { announce } from '#services/events'

async function descendants(page: Page, trashed: boolean) {
  const found: Page[] = []
  let parents = [page.id]
  for (let depth = 0; depth < 32 && parents.length; depth++) {
    const query = Page.query().whereIn('parent_id', parents)
    if (trashed) query.whereNotNull('deleted_at')
    else query.whereNull('deleted_at')
    const children = await query.orderBy('path')
    found.push(...children)
    parents = children.map((child) => child.id)
  }
  return found
}

function sameMoment(a: DateTime | null, b: DateTime | null) {
  return Boolean(a && b && Math.abs(a.toMillis() - b.toMillis()) < 1000)
}

export async function trashPage(
  origin: OriginSource,
  page: Page,
  metadata: Record<string, unknown> = {}
) {
  const now = DateTime.now().set({ millisecond: 0 })
  page.deletedAt = now
  await page.save()
  await audit(origin, 'page.trashed', page, metadata)
  await announce('page.trashed', page, { origin })

  const children = await descendants(page, false)
  for (const child of children) {
    child.deletedAt = now
    await child.save()
    await audit(origin, 'page.trashed', child, { path: child.path, withParent: page.id })
    await announce('page.trashed', child, { origin })
  }
  return children.length
}

export async function trashedWith(page: Page) {
  const children = await descendants(page, true)
  const ids = new Set([page.id])
  return children.filter((child) => {
    if (!ids.has(child.parentId!) || !sameMoment(child.deletedAt, page.deletedAt)) return false
    ids.add(child.id)
    return true
  })
}

export async function restorePageTree(
  origin: OriginSource,
  page: Page,
  options: { asDraft: boolean }
) {
  const children = await trashedWith(page)
  for (const record of [page, ...children]) {
    const demoted = options.asDraft && record.status === 'published'
    record.deletedAt = null
    if (demoted) record.status = 'draft'
    await record.save()
    await audit(origin, 'page.restored', record, {
      ...(demoted ? { asDraft: true } : {}),
      ...(record.id !== page.id ? { withParent: page.id } : {}),
    })
    await announce('page.restored', record, { origin })
  }
  return children.length
}

export async function liveChildren(page: Page) {
  return Page.query().where('parent_id', page.id).whereNull('deleted_at').first()
}

export async function purgePageTree(origin: OriginSource, page: Page) {
  const children = await descendants(page, true)
  for (const record of [...children.reverse(), page]) {
    await audit(
      origin,
      'page.deleted',
      record,
      record.id !== page.id ? { withParent: page.id } : {}
    )
    await record.delete()
    await announce('page.purged', record, { origin })
  }
  return children.length
}

export async function trashedChildCount(page: Page) {
  const children = await descendants(page, true)
  return children.length
}
