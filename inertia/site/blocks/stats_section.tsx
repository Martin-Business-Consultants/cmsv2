import type { RenderBlock } from '#types/site'
import { cn } from '~/lib/utils'
import SiteImage from '~/site/image'
import { Container, Section } from '~/site/section'

export default function StatsSection({ data }: { block: RenderBlock; data: Record<string, any> }) {
  const stats: Record<string, any>[] = data.stats ?? []
  const image = data.image_id
  return (
    <Section tone="muted">
      <Container
        className={cn('grid items-center gap-12', image?.url && 'lg:grid-cols-2 lg:gap-16')}
      >
        <div>
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              {data.heading}
            </h2>
            {data.body && (
              <p className="mt-4 text-lg leading-relaxed whitespace-pre-line text-muted-foreground">
                {data.body}
              </p>
            )}
          </div>
          <dl
            className={cn(
              'mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2',
              !image?.url && stats.length >= 3 && 'lg:grid-cols-3',
              !image?.url && stats.length >= 4 && 'lg:grid-cols-4'
            )}
          >
            {stats.map((stat, index) => (
              <div key={index} className="border-l-2 border-foreground pl-5">
                <dt className="text-sm text-muted-foreground">{stat.label}</dt>
                <dd className="mt-1 text-4xl font-semibold tracking-tight sm:text-5xl">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
        {image?.url && (
          <SiteImage
            asset={image}
            sizes="(min-width: 1024px) 560px, 100vw"
            className="aspect-[4/3] w-full rounded-2xl object-cover shadow-lg"
          />
        )}
      </Container>
    </Section>
  )
}
