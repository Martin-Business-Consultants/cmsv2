import type { HttpContext } from '@adonisjs/core/http'
import { errors } from '@vinejs/vine'
import Page from '#models/page'
import Entry from '#models/entry'
import Collection from '#models/collection'
import { translationValidator } from '#validators/taxonomy'
import { pathFor, snapshot as snapshotPage } from '#services/pages'
import { findEntry, snapshot as snapshotEntry } from '#services/entries'
import {
  assertLocaleEnabled,
  assertTranslationFree,
  ensureTranslationGroup,
} from '#services/locales'
import { copyTaxonomy } from '#services/taxonomy'
import { audit } from '#services/audit'
import type { Seo } from '#types/content'
import { announce } from '#services/events'

function languageName(locale: string) {
  try {
    return new Intl.DisplayNames(['en'], { type: 'language' }).of(locale) ?? locale
  } catch {
    return locale
  }
}

function withoutCanonical(seo: Seo | null): Seo {
  const { canonicalUrl, ...rest } = seo ?? {}
  return rest
}

async function freeSlug(
  slug: string,
  locale: string,
  taken: (candidate: string) => Promise<boolean>
) {
  for (const candidate of [slug, `${slug}-${locale}`]) {
    if (!(await taken(candidate))) return candidate
  }
  throw new errors.E_VALIDATION_ERROR([
    {
      field: 'locale',
      message: `Both “${slug}” and “${slug}-${locale}” are already taken in "${locale}"`,
      rule: 'unique',
    },
  ])
}

async function translatedParent(parentId: number | null, locale: string) {
  if (!parentId) return null
  const parent = await Page.find(parentId)
  if (!parent?.translationGroupId) return parentId
  const sibling = await Page.query()
    .where('translation_group_id', parent.translationGroupId)
    .where('locale', locale)
    .whereNull('deleted_at')
    .first()
  return sibling?.id ?? parentId
}

export default class TranslationsController {
  async page(ctx: HttpContext) {
    const { request, response, params, bouncer, session, auth } = ctx
    await bouncer.authorize('access', 'pages:write')
    const user = auth.use('web').user!
    const source = await Page.query().where('id', params.id).whereNull('deleted_at').firstOrFail()
    const { locale } = await request.validateUsing(translationValidator)
    await assertLocaleEnabled(locale)
    await assertTranslationFree('page', source, locale)

    const parentId = await translatedParent(source.parentId, locale)
    const slug = await freeSlug(source.slug, locale, async (candidate) => {
      const path = await pathFor(candidate, parentId)
      const found = await Page.query()
        .where('path', path)
        .where('locale', locale)
        .whereNull('deleted_at')
        .first()
      return !!found
    })
    const groupId = await ensureTranslationGroup('page', source)

    const page = await Page.create({
      title: source.title,
      slug,
      parentId,
      path: await pathFor(slug, parentId),
      locale,
      status: 'draft',
      blocks: source.blocks ?? [],
      frontmatter: source.frontmatter ?? {},
      fields: source.fields ?? [],
      seo: withoutCanonical(source.seo),
      categoryEntryId: source.categoryEntryId,
      translationGroupId: groupId,
    })
    await copyTaxonomy('page', source.id, page.id)
    await snapshotPage(page, user)
    await audit(ctx, 'page.created', page, {
      path: page.path,
      status: page.status,
      locale,
      translationOf: source.id,
    })
    await announce('page.created', page, { origin: ctx })

    session.flash('success', `${languageName(locale)} translation created`)
    return response.redirect().toRoute('admin.pages.edit', { id: page.id })
  }

  async entry(ctx: HttpContext) {
    const { request, response, params, bouncer, session, auth } = ctx
    await bouncer.authorize('access', 'entries:write')
    const user = auth.use('web').user!
    const collection = await Collection.findOrFail(params.collectionId)
    const source = await findEntry(collection, params.id)
    const { locale } = await request.validateUsing(translationValidator)
    await assertLocaleEnabled(locale)
    await assertTranslationFree('entry', source, locale)

    const slug = await freeSlug(source.slug, locale, async (candidate) => {
      const found = await Entry.query()
        .where('collection_id', collection.id)
        .where('slug', candidate)
        .where('locale', locale)
        .whereNull('deleted_at')
        .first()
      return !!found
    })
    const groupId = await ensureTranslationGroup('entry', source)

    const entry = await Entry.create({
      collectionId: collection.id,
      title: source.title,
      slug,
      locale,
      status: 'draft',
      data: source.data ?? {},
      body: source.body ?? null,
      blocks: source.blocks ?? [],
      seo: withoutCanonical(source.seo),
      categoryEntryId: source.categoryEntryId,
      translationGroupId: groupId,
    })
    entry.$setRelated('collection', collection)
    await copyTaxonomy('entry', source.id, entry.id)
    await snapshotEntry(entry, user)
    await audit(ctx, 'entry.created', entry, {
      collection: collection.slug,
      status: entry.status,
      locale,
      translationOf: source.id,
    })
    await announce('entry.created', entry, { origin: ctx })

    session.flash('success', `${languageName(locale)} translation created`)
    return response.redirect().toRoute('admin.entries.edit', {
      collectionId: collection.id,
      id: entry.id,
    })
  }
}
