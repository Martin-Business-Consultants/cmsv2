import type { RenderBlock } from '#types/site'
import { cn } from '~/lib/utils'
import Ctas from '~/site/ctas'
import { Container } from '~/site/section'

export default function CtaBand({ data }: { block: RenderBlock; data: Record<string, any> }) {
  const dark = (data.background ?? 'primary') === 'primary'
  return (
    <section className="py-12 sm:py-16">
      <Container>
        <div
          className={cn(
            'relative isolate overflow-hidden rounded-3xl px-6 py-14 text-center sm:px-16 sm:py-20',
            dark ? 'bg-primary text-primary-foreground' : 'border border-border',
            data.background === 'muted' && 'bg-muted',
            data.background === 'accent' && 'bg-accent text-accent-foreground'
          )}
        >
          {dark && (
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(50%_70%_at_50%_0%,rgb(255_255_255/0.14),transparent)]" />
          )}
          <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            {data.heading}
          </h2>
          {data.body && (
            <p
              className={cn(
                'mx-auto mt-4 max-w-xl text-lg leading-relaxed whitespace-pre-line',
                dark ? 'text-primary-foreground/70' : 'text-muted-foreground'
              )}
            >
              {data.body}
            </p>
          )}
          <Ctas ctas={data.ctas} tone={dark ? 'dark' : 'light'} className="mt-9 justify-center" />
        </div>
      </Container>
    </section>
  )
}
