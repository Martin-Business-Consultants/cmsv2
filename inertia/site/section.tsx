import type { ReactNode } from 'react'
import { cn } from '~/lib/utils'

export function Container({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('mx-auto w-full max-w-6xl px-5 sm:px-8', className)}>{children}</div>
}

export function Section({
  className,
  children,
  tone = 'none',
}: {
  className?: string
  children: ReactNode
  tone?: string
}) {
  return (
    <section
      className={cn(
        'py-14 sm:py-20',
        tone === 'muted' && 'bg-muted/60',
        tone === 'accent' && 'bg-accent',
        tone === 'primary' && 'bg-primary text-primary-foreground',
        className
      )}
    >
      {children}
    </section>
  )
}

export function SectionHeading({
  heading,
  body,
  align = 'left',
  className,
}: {
  heading?: string | null
  body?: string | null
  align?: 'left' | 'center'
  className?: string
}) {
  if (!heading && !body) return null
  return (
    <div
      className={cn(
        'mb-10 max-w-2xl sm:mb-14',
        align === 'center' && 'mx-auto text-center',
        className
      )}
    >
      {heading && (
        <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {heading}
        </h2>
      )}
      {body && (
        <p className="mt-4 text-lg leading-relaxed text-pretty whitespace-pre-line text-muted-foreground">
          {body}
        </p>
      )}
    </div>
  )
}
