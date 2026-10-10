import { Quote as QuoteIcon } from 'lucide-react'
import type { RenderBlock } from '#types/site'
import { Container } from '~/site/section'

export default function Quote({ data }: { block: RenderBlock; data: Record<string, any> }) {
  return (
    <section className="py-16 sm:py-24">
      <Container className="max-w-4xl">
        <figure className="text-center">
          <QuoteIcon className="mx-auto size-10 text-muted-foreground/40" />
          <blockquote className="mt-6 text-2xl leading-snug font-medium tracking-tight text-balance whitespace-pre-line sm:text-3xl">
            {data.text}
          </blockquote>
          {data.attribution && (
            <figcaption className="mt-8 text-sm font-medium text-muted-foreground">
              {data.attribution}
            </figcaption>
          )}
        </figure>
      </Container>
    </section>
  )
}
