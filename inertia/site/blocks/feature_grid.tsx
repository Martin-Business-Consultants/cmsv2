import type { RenderBlock } from '#types/site'
import { cn } from '~/lib/utils'
import { TextLink } from '~/site/ctas'
import SiteIcon from '~/site/icon'
import { Container, Section, SectionHeading } from '~/site/section'

const columns: Record<string, string> = {
  '2': 'sm:grid-cols-2',
  '3': 'sm:grid-cols-2 lg:grid-cols-3',
  '4': 'sm:grid-cols-2 lg:grid-cols-4',
}

export default function FeatureGrid({ data }: { block: RenderBlock; data: Record<string, any> }) {
  const items: Record<string, any>[] = data.items ?? []
  return (
    <Section>
      <Container>
        <SectionHeading heading={data.heading} body={data.body} align="center" />
        <div className={cn('grid gap-5', columns[String(data.columns)] ?? columns['3'])}>
          {items.map((item, index) => (
            <div
              key={index}
              className="group rounded-2xl border border-border bg-card p-6 transition-shadow hover:shadow-md sm:p-7"
            >
              {item.icon && (
                <div className="mb-5 flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <SiteIcon name={item.icon} className="size-5" />
                </div>
              )}
              <h3 className="text-lg font-semibold tracking-tight">{item.title}</h3>
              {item.body && (
                <p className="mt-2 leading-relaxed whitespace-pre-line text-muted-foreground">
                  {item.body}
                </p>
              )}
              {item.link?.href && (
                <div className="mt-5">
                  <TextLink link={item.link} />
                </div>
              )}
            </div>
          ))}
        </div>
      </Container>
    </Section>
  )
}
