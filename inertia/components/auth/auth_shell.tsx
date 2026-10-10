import type { ReactNode } from 'react'
import { Head, usePage } from '@inertiajs/react'
import { CircleAlert, CircleCheck } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'

export function Notice({ tone, children }: { tone: 'success' | 'error'; children: ReactNode }) {
  const Icon = tone === 'error' ? CircleAlert : CircleCheck
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={
        tone === 'error'
          ? 'border-destructive/30 bg-destructive/5 text-destructive flex items-start gap-2 rounded-md border px-3 py-2 text-sm'
          : 'flex items-start gap-2 rounded-md border border-emerald-600/30 bg-emerald-600/5 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400'
      }
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div>{children}</div>
    </div>
  )
}

export default function AuthShell({
  title,
  description,
  footer,
  children,
}: {
  title: string
  description?: ReactNode
  footer?: ReactNode
  children: ReactNode
}) {
  const { flash, props } = usePage()
  const brand = props.brand

  return (
    <div className="bg-muted/40 flex min-h-svh flex-col items-center justify-center gap-6 p-4 sm:p-6">
      <Head title={title} />
      {brand?.logoUrl ? (
        <img src={brand.logoUrl} alt={brand.siteName} className="h-8 w-auto" />
      ) : brand?.siteName ? (
        <span className="text-lg font-semibold tracking-tight">{brand.siteName}</span>
      ) : null}
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent className="grid gap-4">
          {flash.error && <Notice tone="error">{flash.error}</Notice>}
          {flash.success && <Notice tone="success">{flash.success}</Notice>}
          {children}
        </CardContent>
      </Card>
      {footer && <div className="text-muted-foreground text-center text-sm">{footer}</div>}
    </div>
  )
}
