import type { RenderBlock } from '#types/site'
import SiteImage from '~/site/image'
import { Container } from '~/site/section'

export default function Gallery({ data }: { block: RenderBlock; data: Record<string, any> }) {
  const items: Record<string, any>[] = (data.items ?? []).filter((item: any) => item.asset_id?.url)
  if (!items.length) return null
  return (
    <section className="py-12 sm:py-16">
      <Container>
        <div className="columns-1 gap-5 sm:columns-2 lg:columns-3">
          {items.map((item, index) => (
            <figure key={index} className="mb-5 break-inside-avoid">
              <SiteImage
                asset={item.asset_id}
                sizes="(min-width: 1024px) 370px, (min-width: 640px) 50vw, 100vw"
                className="w-full rounded-xl ring-1 ring-border"
              />
              {item.caption && (
                <figcaption className="mt-2 text-sm text-muted-foreground">
                  {item.caption}
                </figcaption>
              )}
            </figure>
          ))}
        </div>
      </Container>
    </section>
  )
}
