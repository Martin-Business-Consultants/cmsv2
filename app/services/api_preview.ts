import type Page from '#models/page'
import type Entry from '#models/entry'
import type Collection from '#models/collection'
import { absoluteUrl, serializeEntry, serializePage } from '#services/delivery'

export type ApiPreview = {
  path: string
  url: string
  cli: string
  live: boolean
  json: string
}

function render(path: string, cli: string, live: boolean, data: unknown): ApiPreview {
  return {
    path,
    url: absoluteUrl(path),
    cli,
    live,
    json: JSON.stringify({ data, meta: {} }, null, 2),
  }
}

export async function pageApiPreview(page: Page) {
  return render(
    `/api/v1/pages/${page.path}`,
    `cms page ${page.path}`,
    page.isLive,
    await serializePage(page)
  )
}

export async function entryApiPreview(entry: Entry, collection: Collection) {
  return render(
    `/api/v1/collections/${collection.slug}/entries/${entry.slug}`,
    `cms entry ${collection.slug} ${entry.slug}`,
    entry.isLive,
    await serializeEntry(entry, collection)
  )
}
