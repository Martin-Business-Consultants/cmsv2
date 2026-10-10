import type { RenderBlock } from '#types/site'
import { cn } from '~/lib/utils'
import { TextLink } from '~/site/ctas'
import SiteImage from '~/site/image'
import Markdown from '~/site/markdown'
import { Container, Section } from '~/site/section'

export default function MediaText({ data }: { block: RenderBlock; data: Record<string, any> }) {
  const image = data.image_id
  const left = data.side === 'left'
  return (
    <Section tone={data.background}>
      <Container
        className={cn('grid items-center gap-10 lg:gap-16', image?.url && 'lg:grid-cols-2')}
      >
        <div className={cn(left && image?.url && 'lg:order-2', !image?.url && 'max-w-3xl')}>
          <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            {data.heading}
          </h2>
          <Markdown source={data.body} className="mt-6" />
          {data.cta_url?.href && (
            <div className="mt-8">
              <TextLink link={data.cta_url} label={data.cta_label} />
            </div>
          )}
        </div>
        {image?.url && (
          <SiteImage
            asset={image}
            sizes="(min-width: 1024px) 560px, 100vw"
            className="aspect-[4/3] w-full rounded-2xl object-cover shadow-lg ring-1 ring-border"
          />
        )}
      </Container>
    </Section>
  )
}
