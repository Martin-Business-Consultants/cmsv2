import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { router } from '@inertiajs/react'
import { Code, ExternalLink, Search, TriangleAlert } from 'lucide-react'
import type { Seo } from '#types/content'
import { Badge } from '~/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '~/components/ui/tabs'
import CopyField from '~/components/admin/copy_field'
import type { Errors } from '~/lib/errors'
import { errorAt, errorsUnder } from '~/lib/errors'

export type EditorTab = 'edit' | 'seo' | 'json'

const TABS: EditorTab[] = ['edit', 'seo', 'json']

export function useEditorTab(onOpen?: (tab: EditorTab) => void) {
  const [tab, setTab] = useState<EditorTab>(() => {
    const wanted = window.location.hash.slice(1) as EditorTab
    return TABS.includes(wanted) ? wanted : 'edit'
  })
  const opened = useRef(false)

  useEffect(() => {
    if (opened.current) return
    opened.current = true
    if (tab !== 'edit') onOpen?.(tab)
  })

  function select(next: EditorTab) {
    setTab(next)
    onOpen?.(next)
    window.history.replaceState(window.history.state, '', `#${next}`)
  }

  return [tab, select] as const
}

function ErrorBadge({ count }: { count: number }) {
  if (!count) return null
  return (
    <Badge variant="destructive" className="h-5 min-w-5 rounded-full px-1.5 text-[11px]">
      {count}
    </Badge>
  )
}

export function EditorTabs({
  tab,
  onSelect,
  errors,
}: {
  tab: EditorTab
  onSelect: (tab: EditorTab) => void
  errors: Errors
}) {
  const seoErrors = errorsUnder(errors, 'seo').length
  const editErrors = Object.keys(errors).filter(
    (key) => !key.startsWith('seo') && !['form', 'lockVersion'].includes(key) && errors[key]
  ).length

  return (
    <Tabs value={tab} onValueChange={(value) => onSelect(value as EditorTab)}>
      <TabsList variant="line" className="mb-2 h-auto w-full justify-start border-b pb-1">
        <TabsTrigger value="edit" className="flex-none px-3">
          Edit
          <ErrorBadge count={editErrors} />
        </TabsTrigger>
        <TabsTrigger value="seo" className="flex-none px-3">
          <Search />
          SEO
          <ErrorBadge count={seoErrors} />
        </TabsTrigger>
        <TabsTrigger value="json" className="flex-none px-3">
          <Code />
          JSON
        </TabsTrigger>
      </TabsList>
    </Tabs>
  )
}

export function EditorNotices({ errors, reviewHref }: { errors: Errors; reviewHref?: string }) {
  const stale = errorAt(errors, 'lockVersion')
  const denied = errorAt(errors, 'form')
  if (!stale && !denied) return null

  return (
    <div
      role="alert"
      data-editor-notice
      className="border-destructive/30 bg-destructive/5 text-destructive mb-4 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm"
    >
      <TriangleAlert className="mt-0.5 size-4 shrink-0" />
      <div className="grid gap-1">
        {stale && <p>{stale}</p>}
        {stale && reviewHref && (
          <a
            href={reviewHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-fit items-center gap-1 font-medium underline underline-offset-4"
          >
            Review their version
            <ExternalLink className="size-3.5" />
          </a>
        )}
        {denied && <p>{denied}</p>}
      </div>
    </div>
  )
}

export function ReferenceBox({ reference }: { reference: string }) {
  return (
    <div className="grid gap-1.5">
      <span className="text-muted-foreground text-xs">Reference</span>
      <CopyField value={reference} />
    </div>
  )
}

function relativeTime(iso: string) {
  const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000)
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31536000],
    ['month', 2592000],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ]
  const format = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return format.format(Math.round(seconds / size), unit)
  }
  return 'just now'
}

export function StatusLine({ blocks, updatedAt }: { blocks?: number; updatedAt?: string | null }) {
  const parts: string[] = []
  if (blocks !== undefined) parts.push(`${blocks} ${blocks === 1 ? 'block' : 'blocks'}`)
  if (updatedAt) parts.push(`Last edited ${relativeTime(updatedAt)}`)
  if (!parts.length) return null
  return (
    <p className="text-muted-foreground bg-muted/40 rounded-b-xl border-t px-4 py-2.5 text-xs">
      {parts.join(' · ')}
    </p>
  )
}

export function compactSeo(seo: Seo): Seo {
  return Object.fromEntries(
    Object.entries(seo ?? {}).filter(
      ([, value]) => value !== '' && value !== null && value !== undefined
    )
  ) as Seo
}

export function cancelOnEscape(backHref: string, dirty: boolean) {
  return (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || event.defaultPrevented || dirty) return
    const target = event.target as HTMLElement
    if (
      target.closest('[role=dialog],[role=listbox],[role=menu],[data-radix-popper-content-wrapper]')
    )
      return
    router.visit(backHref)
  }
}
