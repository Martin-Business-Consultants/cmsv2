import { Children, Fragment, type ReactNode } from 'react'
import { Link } from '@adonisjs/inertia/react'
import ConfirmAction from '~/components/admin/confirm_action'
import { cn } from '~/lib/utils'

const actionClass =
  'rounded-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline focus-visible:text-foreground focus-visible:underline focus-visible:outline-none'

export function RowTitle({
  href,
  children,
  className,
}: {
  href: string
  children: ReactNode
  className?: string
}) {
  return (
    <Link
      href={href}
      data-list-open
      className={cn('font-medium underline-offset-2 hover:underline', className)}
    >
      {children}
    </Link>
  )
}

export function RowActions({ children }: { children: ReactNode }) {
  const items = Children.toArray(children).filter(Boolean)
  if (!items.length) return null
  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs opacity-0 transition-opacity group-focus-within/row:opacity-100 group-hover/row:opacity-100 group-data-[keyboard-current]/row:opacity-100 [@media(hover:none)]:opacity-100">
      {items.map((item, index) => (
        <Fragment key={index}>
          {index > 0 && (
            <span aria-hidden className="text-border">
              |
            </span>
          )}
          {item}
        </Fragment>
      ))}
    </div>
  )
}

export function RowAction({
  href,
  external,
  keys,
  destructive,
  children,
}: {
  href: string
  external?: boolean
  keys?: string
  destructive?: boolean
  children: ReactNode
}) {
  const className = cn(actionClass, destructive && 'text-destructive hover:text-destructive')
  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" data-keys={keys} className={className}>
        {children}
      </a>
    )
  }
  return (
    <Link href={href} data-keys={keys} className={className}>
      {children}
    </Link>
  )
}

export function RowActionButton({
  onClick,
  keys,
  destructive,
  children,
}: {
  onClick: () => void
  keys?: string
  destructive?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      data-keys={keys}
      onClick={onClick}
      className={cn(actionClass, destructive && 'text-destructive hover:text-destructive')}
    >
      {children}
    </button>
  )
}

export function RowActionConfirm({
  href,
  method = 'delete',
  title,
  description,
  confirmLabel,
  destructive = true,
  keys,
  children,
}: {
  href: string
  method?: 'delete' | 'post' | 'put'
  title: string
  description?: ReactNode
  confirmLabel?: string
  destructive?: boolean
  keys?: string
  children: ReactNode
}) {
  return (
    <ConfirmAction
      href={href}
      method={method}
      title={title}
      description={description}
      confirmLabel={confirmLabel}
      destructive={destructive}
      trigger={
        <button
          type="button"
          data-keys={keys}
          className={cn(actionClass, destructive && 'text-destructive hover:text-destructive')}
        >
          {children}
        </button>
      }
    />
  )
}
