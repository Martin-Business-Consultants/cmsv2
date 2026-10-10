import { ArrowRight } from 'lucide-react'
import type { ResolvedLink } from '#types/site'
import { cn } from '~/lib/utils'
import SmartLink from '~/site/smart_link'

export type Cta = { label?: string; url?: ResolvedLink | null; style?: string }

const styles = {
  light: {
    primary: 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90',
    secondary: 'border border-border bg-background text-foreground shadow-xs hover:bg-muted',
    ghost: 'text-foreground hover:bg-muted',
  },
  dark: {
    primary: 'bg-background text-foreground shadow-sm hover:bg-background/90',
    secondary: 'bg-background text-foreground shadow-sm hover:bg-background/90',
    ghost:
      'border border-primary-foreground/25 text-primary-foreground hover:bg-primary-foreground/10',
  },
}

export default function Ctas({
  ctas,
  tone = 'light',
  className,
}: {
  ctas: Cta[] | undefined
  tone?: 'light' | 'dark'
  className?: string
}) {
  const items = (ctas ?? []).filter((cta) => cta.url?.href)
  if (!items.length) return null
  return (
    <div className={cn('flex flex-wrap items-center gap-3', className)}>
      {items.map((cta, index) => {
        const style = (cta.style ?? 'primary') as keyof (typeof styles)['light']
        return (
          <SmartLink
            key={index}
            href={cta.url!.href}
            className={cn(
              'group inline-flex h-11 items-center justify-center gap-2 rounded-full px-6 text-sm font-medium transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none',
              styles[tone][style] ?? styles[tone].primary
            )}
          >
            {cta.label || cta.url!.label}
            {style === 'primary' && (
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            )}
          </SmartLink>
        )
      })}
    </div>
  )
}

export function TextLink({
  link,
  label,
}: {
  link: ResolvedLink | null | undefined
  label?: string
}) {
  if (!link?.href) return null
  return (
    <SmartLink
      href={link.href}
      className="group inline-flex items-center gap-1.5 text-sm font-medium text-foreground underline-offset-4 hover:underline"
    >
      {label || link.label || 'Learn more'}
      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
    </SmartLink>
  )
}
