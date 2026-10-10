import type { ReactNode } from 'react'
import { Link } from '@adonisjs/inertia/react'
import { ChevronLeft } from 'lucide-react'

export default function PageHeader({
  title,
  description,
  back,
  actions,
  children,
}: {
  title: ReactNode
  description?: ReactNode
  back?: { href: string; label: string }
  actions?: ReactNode
  children?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-col gap-4">
      {back && (
        <Link
          href={back.href}
          className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1 text-sm"
        >
          <ChevronLeft className="size-4" />
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description && <p className="text-muted-foreground mt-1 text-sm">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  )
}
