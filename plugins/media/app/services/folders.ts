import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import Asset from '../models/asset.js'
import AssetFolder from '../models/asset_folder.js'
import { assertValid } from '#services/fields'

export const ROOT = '/'

export type FolderNode = { path: string; name: string; parent: string; count: number }

export function normalizeFolder(value: unknown) {
  const segments = String(value ?? '')
    .split('/')
    .map((segment) => segment.trim())
    .filter((segment) => segment && segment !== '.' && segment !== '..')
  return segments.length ? `/${segments.join('/')}` : ROOT
}

export function joinFolder(parent: string, name: string) {
  return normalizeFolder(`${parent}/${name.replace(/\//g, '-')}`)
}

export function parentOf(path: string) {
  return path.slice(0, path.lastIndexOf('/')) || ROOT
}

export function nameOf(path: string) {
  return path === ROOT ? 'Library' : path.slice(path.lastIndexOf('/') + 1)
}

export function isWithin(path: string, ancestor: string) {
  return ancestor === ROOT || path === ancestor || path.startsWith(`${ancestor}/`)
}

function ancestorsOf(path: string) {
  const out: string[] = []
  for (let current = path; current !== ROOT; current = parentOf(current)) out.unshift(current)
  return out
}

export async function folderTree(): Promise<FolderNode[]> {
  const stored = await AssetFolder.query().select('path')
  const counts = await Asset.query()
    .apply((scopes) => scopes.active())
    .select('folder')
    .count('* as total')
    .groupBy('folder')
  const totals = new Map(counts.map((row) => [row.folder, Number(row.$extras.total)]))
  const paths = new Set<string>()
  for (const path of [...stored.map((folder) => folder.path), ...totals.keys()]) {
    for (const ancestor of ancestorsOf(normalizeFolder(path))) paths.add(ancestor)
  }
  const root: FolderNode = {
    path: ROOT,
    name: nameOf(ROOT),
    parent: '',
    count: totals.get(ROOT) ?? 0,
  }
  return [
    root,
    ...[...paths]
      .sort((a, b) => a.localeCompare(b))
      .map((path) => ({
        path,
        name: nameOf(path),
        parent: parentOf(path),
        count: totals.get(path) ?? 0,
      })),
  ]
}

export async function ensureFolder(path: string, trx?: TransactionClientContract) {
  for (const ancestor of ancestorsOf(normalizeFolder(path))) {
    await AssetFolder.firstOrCreate({ path: ancestor }, { path: ancestor }, { client: trx })
  }
  return normalizeFolder(path)
}

async function folderExists(path: string) {
  if (path === ROOT) return true
  const stored = await AssetFolder.query().where('path', path).first()
  if (stored) return true
  const asset = await Asset.query()
    .where((query) => query.where('folder', path).orWhereLike('folder', `${path}/%`))
    .first()
  return Boolean(asset)
}

export async function createFolder(parent: string, name: string) {
  const path = joinFolder(normalizeFolder(parent), name)
  if (await folderExists(path)) {
    assertValid([
      { field: 'name', message: 'A folder with this name already exists here', rule: 'unique' },
    ])
  }
  return ensureFolder(path)
}

export async function moveFolder(from: string, to: string) {
  const source = normalizeFolder(from)
  const target = normalizeFolder(to)
  if (source === ROOT)
    assertValid([{ field: 'name', message: 'The library root can’t be moved', rule: 'root' }])
  if (source === target) return target
  if (isWithin(target, source)) {
    assertValid([{ field: 'parent', message: 'A folder can’t move inside itself', rule: 'within' }])
  }
  if (await folderExists(target)) {
    assertValid([
      { field: 'name', message: 'A folder with this name already exists there', rule: 'unique' },
    ])
  }
  await db.transaction(async (trx) => {
    const rename = (path: string) => `${target}${path.slice(source.length)}`
    const folders = await AssetFolder.query({ client: trx })
      .where('path', source)
      .orWhereLike('path', `${source}/%`)
    for (const folder of folders) {
      folder.path = rename(folder.path)
      await folder.save()
    }
    const assets = await Asset.query({ client: trx })
      .where('folder', source)
      .orWhereLike('folder', `${source}/%`)
    for (const asset of assets) {
      asset.folder = rename(asset.folder)
      await asset.save()
    }
    await ensureFolder(target, trx)
  })
  return target
}

export async function removeFolder(path: string) {
  const source = normalizeFolder(path)
  if (source === ROOT) return ROOT
  const parent = parentOf(source)
  await db.transaction(async (trx) => {
    const rename = (value: string) => normalizeFolder(`${parent}/${value.slice(source.length + 1)}`)
    await AssetFolder.query({ client: trx }).where('path', source).delete()
    const folders = await AssetFolder.query({ client: trx }).whereLike('path', `${source}/%`)
    for (const folder of folders) {
      const renamed = rename(folder.path)
      const taken = await AssetFolder.query({ client: trx }).where('path', renamed).first()
      if (taken) await folder.useTransaction(trx).delete()
      else {
        folder.path = renamed
        await folder.save()
      }
    }
    const assets = await Asset.query({ client: trx })
      .where('folder', source)
      .orWhereLike('folder', `${source}/%`)
    for (const asset of assets) {
      asset.folder = asset.folder === source ? parent : rename(asset.folder)
      await asset.save()
    }
  })
  return parent
}
