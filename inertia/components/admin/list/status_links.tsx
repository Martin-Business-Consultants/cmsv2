import { Link } from '@adonisjs/inertia/react'
import { cn } from '~/lib/utils'
import { useListUrl } from './query'

export type StatusOption = {
  label: string
  value: string
  count?: number
  href?: string
  hideWhenEmpty?: boolean
}

export default function StatusLinks({
  param = 'status',
  current,
  options,
  className,
}: {
  param?: string
  current: string
  options: StatusOption[]
  className?: string
}) {
  const { href } = useListUrl()
  const visible = options.filter(
    (option) => !option.hideWhenEmpty || option.count || option.value === current
  )

  return (
    <nav aria-label="Filter by status" className={cn('mb-3', className)}>
      <ul className="flex flex-wrap items-center gap-x-1 gap-y-1 text-sm">
        {visible.map((option, index) => {
          const chosen = option.value === current && !option.href
          return (
            <li key={`${option.value}-${option.label}`} className="flex items-center gap-1">
              {index > 0 && (
                <span aria-hidden className="text-border px-0.5">
                  |
                </span>
              )}
              <Link
                href={option.href ?? href({ [param]: option.value })}
                preserveScroll
                aria-current={chosen ? 'page' : undefined}
                className={cn(
                  'inline-flex h-7 items-center gap-1.5 rounded-md px-2 transition-colors',
                  chosen
                    ? 'bg-muted text-foreground font-medium'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                )}
              >
                {option.label}
                {option.count !== undefined && (
                  <span className="text-muted-foreground text-xs tabular-nums">
                    ({option.count})
                  </span>
                )}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
