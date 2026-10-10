import { Link } from '@adonisjs/inertia/react'
import { GitCompare, RotateCcw } from 'lucide-react'
import type { ContentDiffResult } from '#services/content_diff'
import { Button } from '~/components/ui/button'
import { Card, CardContent } from '~/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table'
import ConfirmAction from '~/components/admin/confirm_action'
import { Pagination, type ListMeta } from '~/components/admin/list'
import VersionDiff, { differsLabel } from '~/components/admin/version_diff'
import { formatDateTime } from '~/lib/format'

export type VersionRow = {
  id: number
  title: string
  createdAt: string | null
  author: string | null
}

type Restore = { href: (version: VersionRow) => string; description: string } | null

export function VersionsTable({
  versions,
  differs,
  meta,
  showHref,
  restore,
}: {
  versions: VersionRow[]
  differs: Record<string, string[]>
  meta: ListMeta
  showHref: (version: VersionRow) => string
  restore: Restore
}) {
  return (
    <>
      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Saved</TableHead>
              <TableHead>By</TableHead>
              <TableHead>Differs from now</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {versions.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground py-10 text-center">
                  No saved versions yet. One is kept each time the content changes.
                </TableCell>
              </TableRow>
            )}
            {versions.map((version) => {
              const changed = differs[version.id] ?? []
              return (
                <TableRow key={version.id} data-list-item>
                  <TableCell>
                    <Link
                      href={showHref(version)}
                      data-list-open
                      className="font-medium hover:underline"
                    >
                      {formatDateTime(version.createdAt)}
                    </Link>
                    <div className="text-muted-foreground max-w-xs truncate text-xs">
                      {version.title}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{version.author ?? '—'}</TableCell>
                  <TableCell data-differs>
                    {changed.length ? (
                      differsLabel(changed)
                    ) : (
                      <span className="text-muted-foreground">Same as now</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={showHref(version)}>
                        <GitCompare />
                        Compare
                      </Link>
                    </Button>
                    {restore && changed.length > 0 && (
                      <ConfirmAction
                        href={restore.href(version)}
                        method="post"
                        destructive={false}
                        title="Restore this version?"
                        description={restore.description}
                        confirmLabel="Restore"
                        trigger={
                          <Button variant="ghost" size="sm">
                            <RotateCcw />
                            Restore
                          </Button>
                        }
                      />
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
      <Pagination meta={meta} />
    </>
  )
}

export function VersionDetail({
  version,
  diff,
  blockLabels,
  restoreHref,
  restoreDescription,
}: {
  version: VersionRow
  diff: ContentDiffResult
  blockLabels: Record<string, string>
  restoreHref: string | null
  restoreDescription: string
}) {
  const matches = diff.fields.length === 0
  return (
    <Card>
      <CardContent className="grid gap-5">
        <p className="text-muted-foreground text-sm">
          Saved <span className="text-foreground">{formatDateTime(version.createdAt)}</span>
          {version.author && (
            <>
              {' '}
              by <span className="text-foreground font-medium">{version.author}</span>
            </>
          )}
          .{' '}
          {matches
            ? 'It matches the content as it is now.'
            : 'Below, “now” is the content as it is, and “this version” is what restoring brings back.'}
        </p>
        {!matches && <VersionDiff diff={diff} blockLabels={blockLabels} />}
        {restoreHref && !matches && (
          <div className="flex justify-end border-t pt-5">
            <ConfirmAction
              href={restoreHref}
              method="post"
              destructive={false}
              title="Restore this version?"
              description={restoreDescription}
              confirmLabel="Restore"
              trigger={
                <Button>
                  <RotateCcw />
                  Restore this version
                </Button>
              }
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
