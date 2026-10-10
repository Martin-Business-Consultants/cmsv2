import { errors } from '@vinejs/vine'
import Entry from '#models/entry'
import EntryVersion from '#models/entry_version'
import type Collection from '#models/collection'
import type User from '#models/user'

export async function findEntry(collection: Collection, id: number | string) {
  const entry = await Entry.query()
    .where('collection_id', collection.id)
    .where('id', id)
    .whereNull('deleted_at')
    .firstOrFail()
  entry.$setRelated('collection', collection)
  return entry
}

export async function assertEntrySlugFree(
  collectionId: number,
  slug: string,
  exceptId?: number,
  locale?: string
) {
  const query = Entry.query()
    .where('collection_id', collectionId)
    .where('slug', slug)
    .whereNull('deleted_at')
  if (exceptId) query.whereNot('id', exceptId)
  if (locale) query.where('locale', locale)
  if (await query.first()) {
    throw new errors.E_VALIDATION_ERROR([
      {
        field: 'slug',
        message: 'Another entry in this collection already uses this slug',
        rule: 'unique',
      },
    ])
  }
}

export async function snapshot(entry: Entry, user?: User | null) {
  await EntryVersion.create({
    entryId: entry.id,
    userId: user?.id ?? null,
    title: entry.title,
    data: entry.data,
    body: entry.body ?? null,
    blocks: entry.blocks ?? [],
    seo: entry.seo,
  })
}
