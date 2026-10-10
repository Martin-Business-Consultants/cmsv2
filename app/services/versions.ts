import db from '@adonisjs/lucid/services/db'
import env from '#start/env'
import BlockType from '#models/block_type'
import type Page from '#models/page'
import type PageVersion from '#models/page_version'
import type Entry from '#models/entry'
import type EntryVersion from '#models/entry_version'
import { changedKeys, changesFromCurrent } from '#services/content_diff'

export const DEFAULT_VERSIONS_KEEP = 100

export function versionsKeep() {
  const keep = Math.floor(Number(env.get('CMS_VERSIONS_KEEP') ?? DEFAULT_VERSIONS_KEEP))
  return Number.isFinite(keep) && keep > 0 ? keep : DEFAULT_VERSIONS_KEEP
}

export function pageVersionSnapshot(version: PageVersion) {
  return {
    title: version.title,
    blocks: version.blocks ?? [],
    seo: version.seo ?? {},
    ...(version.frontmatter ? { frontmatter: version.frontmatter } : {}),
  }
}

export function pageCurrent(page: Page) {
  return {
    title: page.title,
    blocks: page.blocks ?? [],
    seo: page.seo ?? {},
    frontmatter: page.frontmatter ?? {},
  }
}

export function entryVersionSnapshot(version: EntryVersion) {
  return {
    title: version.title,
    data: version.data ?? {},
    seo: version.seo ?? {},
    ...(version.blocks ? { blocks: version.blocks, body: version.body ?? null } : {}),
  }
}

export function entryCurrent(entry: Entry) {
  return {
    title: entry.title,
    data: entry.data ?? {},
    seo: entry.seo ?? {},
    blocks: entry.blocks ?? [],
    body: entry.body ?? null,
  }
}

export function versionDiff(snapshot: Record<string, unknown>, current: Record<string, unknown>) {
  return changesFromCurrent(snapshot, current)
}

export function differsFromNow(
  snapshot: Record<string, unknown>,
  current: Record<string, unknown>
) {
  return changedKeys(snapshot, current)
}

async function pruneTable(table: string, owner: string, keep: number) {
  const result = await db.rawQuery(
    `DELETE FROM ${table} WHERE id IN (
      SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY ${owner} ORDER BY created_at DESC, id DESC) AS position
        FROM ${table}
      ) ranked WHERE position > ?
    )`,
    [keep]
  )
  return Number(result?.changes ?? 0)
}

export async function pruneVersions(keep = versionsKeep()) {
  const pages = await pruneTable('page_versions', 'page_id', keep)
  const entries = await pruneTable('entry_versions', 'entry_id', keep)
  return { keep, pages, entries }
}

export async function blockLabels() {
  const types = await BlockType.query().select('slug', 'label')
  return Object.fromEntries(types.map((type) => [type.slug, type.label]))
}
