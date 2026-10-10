import type { ReactNode } from 'react'
import { Link } from '@adonisjs/inertia/react'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { cn } from '~/lib/utils'
import { useListUrl, type ListMeta } from './query'

const number = new Intl.NumberFormat()

export function pageWindow(current: number, last: number, radius = 2) {
  const pages: (number | null)[] = []
  for (let page = 1; page <= last; page++) {
    if (page === 1 || page === last || Math.abs(page - current) <= radius) {
      pages.push(page)
    } else if (pages.at(-1) !== null) {
      pages.push(null)
    }
  }
  return pages
}

function PageLink({
  page,
  label,
  disabled,
  rel,
  children,
}: {
  page: number
  label: string
  disabled?: boolean
  rel?: string
  children: ReactNode
}) {
  const { href } = useListUrl()
  if (disabled) {
    return (
      <Button variant="outline" size="icon-sm" disabled aria-label={label}>
        {children}
      </Button>
    )
  }
  return (
    <Button asChild variant="outline" size="icon-sm">
      <Link href={href({ page }, false)} aria-label={label} rel={rel}>
        {children}
      </Link>
    </Button>
  )
}

export default function Pagination({ meta, noun }: { meta: ListMeta; noun?: string }) {
  const { href } = useListUrl()
  if (meta.total === 0) return null
  const { currentPage, lastPage } = meta

  return (
    <nav
      aria-label="Pages"
      className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm"
    >
      <p className="text-muted-foreground tabular-nums">
        {number.format(meta.firstRow)}–{number.format(meta.lastRow)} of {number.format(meta.total)}
        {noun ? ` ${noun}` : ''}
      </p>
      {lastPage > 1 && (
        <ul className="flex flex-wrap items-center gap-1">
          <li>
            <PageLink page={1} label="First page" disabled={currentPage === 1}>
              <ChevronsLeft />
            </PageLink>
          </li>
          <li>
            <PageLink
              page={currentPage - 1}
              label="Previous page"
              rel="prev"
              disabled={currentPage === 1}
            >
              <ChevronLeft />
            </PageLink>
          </li>
          {pageWindow(currentPage, lastPage).map((page, index) => (
            <li key={page ?? `gap-${index}`}>
              {page === null ? (
                <span aria-hidden className="text-muted-foreground px-1.5">
                  …
                </span>
              ) : (
                <Button
                  asChild
                  size="sm"
                  variant={page === currentPage ? 'default' : 'ghost'}
                  className={cn(
                    'min-w-8 tabular-nums',
                    page === currentPage && 'pointer-events-none'
                  )}
                >
                  <Link
                    href={href({ page }, false)}
                    aria-label={`Page ${page}`}
                    aria-current={page === currentPage ? 'page' : undefined}
                  >
                    {page}
                  </Link>
                </Button>
              )}
            </li>
          ))}
          <li>
            <PageLink
              page={currentPage + 1}
              label="Next page"
              rel="next"
              disabled={currentPage === lastPage}
            >
              <ChevronRight />
            </PageLink>
          </li>
          <li>
            <PageLink page={lastPage} label="Last page" disabled={currentPage === lastPage}>
              <ChevronsRight />
            </PageLink>
          </li>
        </ul>
      )}
    </nav>
  )
}
