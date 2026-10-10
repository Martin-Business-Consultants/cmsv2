import { useState, type DragEvent, type ReactNode } from 'react'
import { router } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { ChevronRight, Folder, FolderOpen, Library } from 'lucide-react'
import { cn } from '~/lib/utils'
import { urlFor } from '~/client'
import type { FolderNode } from '../types'

export const DRAG_TYPE = 'application/x-media-assets'

export function folderHref(path: string) {
  return path === '/'
    ? urlFor('admin.media.index')
    : `${urlFor('admin.media.index')}?folder=${encodeURIComponent(path)}`
}

export function moveAssets(ids: number[], folder: string, onSuccess?: () => void) {
  router.post(
    urlFor('admin.media.bulk'),
    { action: 'move', ids, folder },
    { preserveScroll: true, onSuccess }
  )
}

function DropTarget({
  path,
  enabled,
  children,
}: {
  path: string
  enabled: boolean
  children: (over: boolean) => ReactNode
}) {
  const [over, setOver] = useState(false)
  if (!enabled) return <>{children(false)}</>

  function accepts(event: DragEvent) {
    return event.dataTransfer.types.includes(DRAG_TYPE)
  }

  return (
    <div
      onDragOver={(event) => {
        if (!accepts(event)) return
        event.preventDefault()
        event.stopPropagation()
        event.dataTransfer.dropEffect = 'move'
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        if (!accepts(event)) return
        event.preventDefault()
        event.stopPropagation()
        setOver(false)
        const ids = JSON.parse(event.dataTransfer.getData(DRAG_TYPE) || '[]') as number[]
        if (ids.length) moveAssets(ids, path)
      }}
    >
      {children(over)}
    </div>
  )
}

function Row({
  label,
  icon,
  href,
  count,
  depth,
  active,
  over,
  toggle,
}: {
  label: string
  icon: ReactNode
  href: string
  count?: number
  depth: number
  active: boolean
  over: boolean
  toggle?: ReactNode
}) {
  return (
    <div
      className={cn(
        'group flex items-center gap-1 rounded-md pr-2 text-sm transition-colors',
        active ? 'bg-accent text-accent-foreground font-medium' : 'hover:bg-accent/60',
        over && 'ring-primary bg-primary/10 ring-2'
      )}
      style={{ paddingLeft: `${depth * 14 + 4}px` }}
    >
      <span className="flex size-5 shrink-0 items-center justify-center">{toggle}</span>
      <Link
        href={href}
        preserveScroll
        className="flex min-w-0 flex-1 items-center gap-2 py-1.5"
        aria-current={active ? 'page' : undefined}
      >
        {icon}
        <span className="truncate">{label}</span>
        {count !== undefined && count > 0 && (
          <span className="text-muted-foreground ml-auto text-xs tabular-nums">{count}</span>
        )}
      </Link>
    </div>
  )
}

export default function FolderTree({
  folders,
  current,
  canMove,
}: {
  folders: FolderNode[]
  current: string
  canMove: boolean
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const children = new Map<string, FolderNode[]>()
  for (const folder of folders) {
    children.set(folder.parent, [...(children.get(folder.parent) ?? []), folder])
  }

  function toggle(path: string) {
    setCollapsed((previous) => {
      const next = new Set(previous)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  function branch(parent: string, depth: number): ReactNode {
    return (children.get(parent) ?? []).map((folder) => {
      const kids = children.get(folder.path)?.length ?? 0
      const open = !collapsed.has(folder.path)
      const active = folder.path === current
      return (
        <li key={folder.path}>
          <DropTarget path={folder.path} enabled={canMove}>
            {(over) => (
              <Row
                label={folder.name}
                href={folderHref(folder.path)}
                count={folder.count}
                depth={depth}
                active={active}
                over={over}
                icon={
                  active ? (
                    <FolderOpen className="text-primary size-4 shrink-0" />
                  ) : (
                    <Folder className="text-muted-foreground size-4 shrink-0" />
                  )
                }
                toggle={
                  kids > 0 && (
                    <button
                      type="button"
                      onClick={() => toggle(folder.path)}
                      aria-label={open ? `Collapse ${folder.name}` : `Expand ${folder.name}`}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <ChevronRight
                        className={cn('size-3.5 transition-transform', open && 'rotate-90')}
                      />
                    </button>
                  )
                }
              />
            )}
          </DropTarget>
          {kids > 0 && open && <ul>{branch(folder.path, depth + 1)}</ul>}
        </li>
      )
    })
  }

  return (
    <nav aria-label="Folders" data-testid="folder-tree">
      <ul className="grid gap-0.5">
        <li>
          <DropTarget path="/" enabled={canMove}>
            {(over) => (
              <Row
                label="Library"
                href={folderHref('/')}
                count={folders.find((folder) => folder.path === '/')?.count}
                depth={0}
                active={current === '/'}
                over={over}
                icon={<Library className="text-muted-foreground size-4 shrink-0" />}
              />
            )}
          </DropTarget>
        </li>
        {branch('/', 1)}
      </ul>
    </nav>
  )
}
