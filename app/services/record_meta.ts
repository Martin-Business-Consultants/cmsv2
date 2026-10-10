import { errors } from '@vinejs/vine'
import type { HttpContext } from '@adonisjs/core/http'
import type Page from '#models/page'
import type Entry from '#models/entry'
import type Collection from '#models/collection'
import type { TaggableType } from '#models/tagging'
import { actorOf } from '#services/actor'
import {
  assertLocaleFreeInGroup,
  localeEditorProps,
  normalizeLocale,
  siteLocales,
} from '#services/locales'
import {
  applyCategory,
  planTaxonomy,
  poolsFor,
  syncTags,
  taxonomyEditorProps,
  type TaxonomyValues,
} from '#services/taxonomy'

export type RecordMetaValues = TaxonomyValues & { locale?: string }

export async function planRecordMeta(
  ctx: HttpContext,
  kind: TaggableType,
  record: Page | Entry,
  values: RecordMetaValues,
  collection?: Collection
) {
  const actor = actorOf(ctx)
  const site = await siteLocales()
  const current = record.$isPersisted ? record.locale : site.defaultLocale
  const locale = values.locale === undefined ? current : normalizeLocale(values.locale)
  if (locale !== current && !site.locales.includes(locale)) {
    throw new errors.E_VALIDATION_ERROR([
      {
        field: 'locale',
        message: `"${locale}" isn't one of the site's languages (${site.locales.join(', ')})`,
        rule: 'locale',
      },
    ])
  }
  if (record.$isPersisted) await assertLocaleFreeInGroup(kind, record, locale)
  const pools = await poolsFor(kind, collection)
  const plan = await planTaxonomy(kind, pools, values, actor)

  return {
    locale,
    async beforeSave() {
      record.locale = locale
      await applyCategory(record, plan, pools, ctx)
    },
    async afterSave() {
      await syncTags(kind, record.id, plan, pools, ctx)
    },
  }
}

export async function recordMetaProps(
  kind: TaggableType,
  record?: Page | Entry,
  collection?: Collection
) {
  const pools = await poolsFor(kind, collection)
  const [taxonomy, locales] = await Promise.all([
    taxonomyEditorProps(kind, pools, record),
    localeEditorProps(kind, record),
  ])
  return { taxonomy, ...locales }
}
