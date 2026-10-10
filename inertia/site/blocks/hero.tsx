import type { RenderBlock } from '#types/site'
import Ctas from '~/site/ctas'
import SiteImage from '~/site/image'
import { Container } from '~/site/section'

export default function Hero({ data }: { block: RenderBlock; data: Record<string, any> }) {
  const image = data.image_id
  if (image?.url) {
    return (
      <section className="relative overflow-hidden border-b border-border/60 bg-gradient-to-b from-muted/70 to-background">
        <Container className="grid items-center gap-12 py-16 sm:py-24 lg:grid-cols-2 lg:gap-16">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
              {data.heading}
            </h1>
            {data.subheading && (
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-pretty whitespace-pre-line text-muted-foreground sm:text-xl">
                {data.subheading}
              </p>
            )}
            <Ctas ctas={data.ctas} className="mt-10" />
          </div>
          <div className="relative">
            <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-tr from-muted to-transparent" />
            <SiteImage
              asset={image}
              eager
              sizes="(min-width: 1024px) 560px, 100vw"
              className="aspect-[4/3] w-full rounded-2xl object-cover shadow-xl ring-1 ring-border"
            />
          </div>
        </Container>
      </section>
    )
  }

  return (
    <section className="relative isolate overflow-hidden border-b border-border/60">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(60%_80%_at_50%_0%,var(--color-muted)_0%,transparent_100%)]" />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] [mask-image:radial-gradient(55%_60%_at_50%_0%,black,transparent)] bg-[size:48px_48px] opacity-60" />
      <Container className="py-24 text-center sm:py-32 lg:py-40">
        <h1 className="mx-auto max-w-4xl text-4xl font-semibold tracking-tight text-balance sm:text-6xl lg:text-7xl">
          {data.heading}
        </h1>
        {data.subheading && (
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-pretty whitespace-pre-line text-muted-foreground sm:text-xl">
            {data.subheading}
          </p>
        )}
        <Ctas ctas={data.ctas} className="mt-10 justify-center" />
      </Container>
    </section>
  )
}
