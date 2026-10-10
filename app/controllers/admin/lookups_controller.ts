import type { HttpContext } from '@adonisjs/core/http'
import Page from '#models/page'
import Entry from '#models/entry'
import type { EntryOption, PageOption } from '#types/content'

function ids(value: unknown) {
  return String(value ?? '')
    .split(',')
    .map(Number)
    .filter(Boolean)
}

export default class LookupsController {
  async pages({ request }: HttpContext) {
    const { search, ids: only } = request.qs()
    const query = Page.query().whereNull('deleted_at').orderBy('path').limit(50)
    if (only) query.whereIn('id', ids(only))
    else if (search)
      query.where((q) => q.whereLike('title', `%${search}%`).orWhereLike('path', `%${search}%`))
    const pages = await query
    const data: PageOption[] = pages.map((page) => ({
      id: page.id,
      title: page.title,
      path: page.path,
    }))
    return { data }
  }

  async entries({ request }: HttpContext) {
    const { search, ids: only, collection } = request.qs()
    const query = Entry.query()
      .whereNull('entries.deleted_at')
      .preload('collection')
      .orderBy('title')
      .limit(50)
    if (only) query.whereIn('entries.id', ids(only))
    else if (search) query.whereLike('title', `%${search}%`)
    if (collection) {
      query.whereHas('collection', (q) => q.where('slug', collection))
    }
    const entries = await query
    const data: EntryOption[] = entries.map((entry) => ({
      id: entry.id,
      title: entry.title,
      collection: entry.collection.slug,
      collectionName: entry.collection.name,
    }))
    return { data }
  }
}
