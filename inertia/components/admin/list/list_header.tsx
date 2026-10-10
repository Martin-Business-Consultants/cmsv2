import type { ReactNode } from 'react'
import { Link } from '@adonisjs/inertia/react'
import { Plus } from 'lucide-react'
import { Button } from '~/components/ui/button'

export default function ListHeader({
  title,
  count,
  addNew,
  search,
  description,
  actions,
  aside,
}: {
  title: ReactNode
  count?: number
  addNew?: { href: string; label: string } | false | null
  search?: string
  description?: ReactNode
  actions?: ReactNode
  aside?: ReactNode
}) {
  return (
    <div className="mb-5 flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            {title}
            {count !== undefined && (
              <span className="text-muted-foreground text-base font-normal tabular-nums">
                ({count})
              </span>
            )}
          </h1>
          {addNew && (
            <Button asChild variant="outline" size="sm">
              <Link href={addNew.href} data-keys="n" title={`${addNew.label} (n)`}>
                <Plus />
                {addNew.label}
              </Link>
            </Button>
          )}
          {actions}
          {search && (
            <span className="text-muted-foreground text-sm">
              Search results for “<span className="text-foreground">{search}</span>”
            </span>
          )}
        </div>
        {aside && <div className="flex items-center gap-2">{aside}</div>}
      </div>
      {description && <p className="text-muted-foreground text-sm">{description}</p>}
    </div>
  )
}
