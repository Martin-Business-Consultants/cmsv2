import type { ReactNode } from 'react'
import { Label } from '~/components/ui/label'
import { cn } from '~/lib/utils'

export default function FormField({
  label,
  htmlFor,
  error,
  help,
  required,
  className,
  children,
}: {
  label?: ReactNode
  htmlFor?: string
  error?: string
  help?: ReactNode
  required?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn('grid gap-2', className)}>
      {label && (
        <Label htmlFor={htmlFor}>
          {label}
          {required && <span className="text-destructive">*</span>}
        </Label>
      )}
      {children}
      {help && !error && <p className="text-muted-foreground text-xs">{help}</p>}
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  )
}
