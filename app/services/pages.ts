import { errors } from '@vinejs/vine'
import Page from '#models/page'
import PageVersion from '#models/page_version'
import type User from '#models/user'

export async function pathFor(slug: string, parentId: number | null | undefined) {
  if (!parentId) return slug
  const parent = await Page.findOrFail(parentId)
  return `${parent.path}/${slug}`
}

export async function assertPathFree(path: string, exceptId?: number, locale?: string) {
  const query = Page.query().where('path', path).whereNull('deleted_at')
  if (exceptId) query.whereNot('id', exceptId)
  if (locale) query.where('locale', locale)
  if (await query.first()) {
    throw new errors.E_VALIDATION_ERROR([
      { field: 'slug', message: `Another page already lives at /${path}`, rule: 'unique' },
    ])
  }
}

export async function assertParentAllowed(page: Page, parentId: number | null | undefined) {
  let current = parentId ? await Page.find(parentId) : null
  while (current) {
    if (current.id === page.id) {
      throw new errors.E_VALIDATION_ERROR([
        { field: 'parentId', message: "A page can't sit under itself", rule: 'parent' },
      ])
    }
    current = current.parentId ? await Page.find(current.parentId) : null
  }
}

export async function rebuildChildPaths(page: Page) {
  const children = await Page.query().where('parent_id', page.id)
  for (const child of children) {
    child.path = `${page.path}/${child.slug}`
    await child.save()
    await rebuildChildPaths(child)
  }
}

export async function snapshot(page: Page, user?: User | null) {
  await PageVersion.create({
    pageId: page.id,
    userId: user?.id ?? null,
    title: page.title,
    blocks: page.blocks,
    frontmatter: page.frontmatter ?? {},
    seo: page.seo,
  })
}
