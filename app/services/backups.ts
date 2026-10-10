import { createRequire } from 'node:module'
import { execFile, spawn } from 'node:child_process'
import { promisify } from 'node:util'
import { tmpdir } from 'node:os'
import { join, basename, resolve } from 'node:path'
import { mkdir, mkdtemp, readdir, rm, stat, unlink, writeFile } from 'node:fs/promises'
import app from '@adonisjs/core/services/app'
import db from '@adonisjs/lucid/services/db'
import env from '#start/env'
import { siteKey } from '#services/webhooks'
import { mergeSetting, getSetting } from '#services/settings'
import { cmsVersion } from '#services/updates'

const run = promisify(execFile)
const require = createRequire(import.meta.url)

type SqliteDatabase = {
  backup(destination: string): Promise<unknown>
  pragma(source: string, options?: { simple?: boolean }): unknown
  close(): void
}

type SqliteConstructor = new (
  filename: string,
  options?: { readonly?: boolean; fileMustExist?: boolean; timeout?: number }
) => SqliteDatabase

const Database = require('better-sqlite3') as SqliteConstructor

export const BUSY_TIMEOUT_MS = 10_000
export const DEFAULT_KEEP = 5
export const ARCHIVE_NAME = /^cms-data-(\d{8})-(\d{6})\.tar\.gz$/
export const BACKUPS_SETTING = 'backups'

const SIDECARS = /-(wal|shm|journal)$/
const SKIPPED = new Set(['backups', 'tmp'])
const SITE_FILES = ['uploads', 'form_uploads']

export class BackupFailed extends Error {}

export type Archive = { name: string; path: string; bytes: number; takenAt: string }

export function dataDir() {
  return app.makePath('storage')
}

export function backupDir() {
  const configured = env.get('CMS_BACKUP_DIR')?.trim()
  return configured ? resolve(configured) : join(dataDir(), 'backups')
}

export function keep() {
  const value = env.get('CMS_BACKUP_KEEP')
  return value && value > 0 ? Math.floor(value) : DEFAULT_KEEP
}

export function databasePath() {
  const connection = db.connection().config.connection as { filename?: string } | undefined
  return connection?.filename ?? join(dataDir(), 'db.sqlite3')
}

function timestamp(date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, '0')
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}-` +
    `${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}`
  )
}

async function exists(path: string) {
  return Boolean(await stat(path).catch(() => null))
}

export async function snapshotDatabase(source: string, destination: string) {
  if (!(await exists(source))) throw new BackupFailed(`No database file at ${source}`)
  const from = new Database(source, { readonly: true, fileMustExist: true, timeout: BUSY_TIMEOUT_MS })
  try {
    await from.backup(destination)
  } catch (error) {
    throw new BackupFailed(`${basename(source)}: the copy stopped (${(error as Error).message})`)
  } finally {
    from.close()
  }
  const copy = new Database(destination, { readonly: true, fileMustExist: true })
  try {
    const check = copy.pragma('quick_check', { simple: true })
    if (check !== 'ok') {
      throw new BackupFailed(`${basename(source)}: the copy doesn't check out (${String(check)})`)
    }
  } finally {
    copy.close()
  }
}

async function tarGz(archive: string, parts: { cwd: string; entries: string[] }[]) {
  const args = ['-czf', archive]
  for (const part of parts) {
    if (!part.entries.length) continue
    args.push('-C', part.cwd, ...part.entries)
  }
  await run('tar', args, { maxBuffer: 10 * 1024 * 1024 })
}

async function presentEntries(root: string, names: string[]) {
  const present: string[] = []
  for (const name of names) if (await exists(join(root, name))) present.push(name)
  return present
}

async function countFiles(root: string): Promise<number> {
  const entries = await readdir(root, { withFileTypes: true }).catch(() => [])
  let total = 0
  for (const entry of entries) {
    if (entry.isDirectory()) total += await countFiles(join(root, entry.name))
    else if (entry.isFile()) total += 1
  }
  return total
}

export async function backupContents() {
  const count = async (table: string) => {
    const row = await db.from(table).whereNull('deleted_at').count('* as total').first()
    return Number(row?.total ?? 0)
  }
  const plain = async (table: string) => {
    const row = await db.from(table).count('* as total').first()
    return Number(row?.total ?? 0)
  }
  let files = 0
  for (const folder of SITE_FILES) files += await countFiles(join(dataDir(), folder))
  return {
    pages: await count('pages'),
    collections: await plain('collections'),
    entries: await count('entries'),
    block_types: await plain('block_types'),
    globals: await count('globals'),
    uploaded_files: files,
  }
}

export function siteBackupFilename() {
  return `cms-backup-${siteKey()}-${timestamp()}.tar.gz`
}

export async function exportSiteBackup() {
  const staging = await mkdtemp(join(tmpdir(), 'cms-backup-'))
  const archive = join(tmpdir(), `cms-backup-${process.pid}-${Date.now()}.tar.gz`)
  try {
    await mkdir(join(staging, 'db'))
    await snapshotDatabase(databasePath(), join(staging, 'db', 'main.sqlite3'))
    const files = await presentEntries(dataDir(), SITE_FILES)
    let count = 0
    for (const folder of files) count += await countFiles(join(dataDir(), folder))
    const manifest = {
      tenant: siteKey(),
      version: await cmsVersion(),
      generated_at: new Date().toISOString(),
      includes: { db: true, files: count, folders: files },
      counts: await backupContents(),
    }
    await writeFile(join(staging, 'manifest.json'), JSON.stringify(manifest, null, 2))
    await tarGz(archive, [
      { cwd: staging, entries: ['manifest.json', 'db'] },
      { cwd: dataDir(), entries: files },
    ])
    const { size } = await stat(archive)
    return { path: archive, bytes: size }
  } catch (error) {
    await unlink(archive).catch(() => {})
    throw error
  } finally {
    await rm(staging, { recursive: true, force: true })
  }
}

export async function listArchives(): Promise<Archive[]> {
  const directory = backupDir()
  const names = await readdir(directory).catch(() => [] as string[])
  const archives: Archive[] = []
  for (const name of names) {
    const match = name.match(ARCHIVE_NAME)
    if (!match) continue
    const info = await stat(join(directory, name)).catch(() => null)
    if (!info?.isFile()) continue
    const [date, time] = [match[1], match[2]]
    const takenAt = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}T${time.slice(0, 2)}:${time.slice(2, 4)}:${time.slice(4, 6)}Z`
    archives.push({ name, path: join(directory, name), bytes: info.size, takenAt })
  }
  return archives.sort((a, b) => b.name.localeCompare(a.name))
}

export async function findArchive(name: string) {
  return (await listArchives()).find((archive) => archive.name === name) ?? null
}

async function databases() {
  const names = await readdir(dataDir()).catch(() => [] as string[])
  return names.filter((name) => name.endsWith('.sqlite3'))
}

async function prune() {
  const archives = await listArchives()
  for (const archive of archives.slice(keep())) await unlink(archive.path).catch(() => {})
}

export async function backupDataDir() {
  const sqlite = await databases()
  if (!sqlite.length) return null
  const directory = backupDir()
  await mkdir(directory, { recursive: true })
  const archive = join(directory, `cms-data-${timestamp()}.tar.gz`)
  const staging = await mkdtemp(join(tmpdir(), 'cms-data-'))
  try {
    for (const name of sqlite) await snapshotDatabase(join(dataDir(), name), join(staging, name))
    const others = (await readdir(dataDir())).filter(
      (name) =>
        !name.endsWith('.sqlite3') &&
        !SIDECARS.test(name) &&
        !SKIPPED.has(name) &&
        !name.startsWith('.') &&
        resolve(dataDir(), name) !== directory
    )
    await tarGz(archive, [
      { cwd: staging, entries: sqlite },
      { cwd: dataDir(), entries: others },
    ])
  } catch (error) {
    await unlink(archive).catch(() => {})
    throw error
  } finally {
    await rm(staging, { recursive: true, force: true })
  }
  await prune()
  return archive
}

export function backupCommand() {
  return env.get('CMS_BACKUP_COMMAND')?.trim() || null
}

export function nightlyEnabled() {
  return env.get('CMS_BACKUP_NIGHTLY') !== false
}

export function shipArchive(archive: string, command = backupCommand()) {
  if (!command) return Promise.resolve(false)
  return new Promise<boolean>((resolvePromise, reject) => {
    const child = spawn('sh', ['-c', `${command} "$1"`, 'sh', archive], {
      stdio: ['ignore', 'ignore', 'pipe'],
    })
    let stderr = ''
    child.stderr.on('data', (chunk: Buffer) => {
      stderr = (stderr + chunk.toString()).slice(-2000)
    })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) resolvePromise(true)
      else reject(new BackupFailed(`CMS_BACKUP_COMMAND exited with ${code}: ${stderr.trim()}`))
    })
  })
}

export type BackupStatus = {
  last_archive?: string | null
  last_at?: string | null
  shipped?: boolean
  error?: string | null
  failed_at?: string | null
}

export async function backupStatus() {
  return (await getSetting<BackupStatus>(BACKUPS_SETTING)) ?? {}
}

export async function nightlyBackup() {
  try {
    const archive = await backupDataDir()
    if (!archive) return null
    const shipped = await shipArchive(archive)
    await mergeSetting<BackupStatus>(BACKUPS_SETTING, {
      last_archive: basename(archive),
      last_at: new Date().toISOString(),
      shipped,
      error: null,
    })
    return archive
  } catch (error) {
    await mergeSetting<BackupStatus>(BACKUPS_SETTING, {
      error: (error as Error).message.slice(0, 1000),
      failed_at: new Date().toISOString(),
    })
    throw error
  }
}

export async function pendingMigrations() {
  if (!(await exists(databasePath()))) return false
  const { MigrationRunner } = await import('@adonisjs/lucid/migration')
  const runner = new MigrationRunner(db, app, { direction: 'up', dryRun: true })
  const list = await runner.getList()
  return list.some((migration) => migration.status === 'pending')
}
