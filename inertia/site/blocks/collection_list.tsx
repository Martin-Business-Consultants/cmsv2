import { ArrowRight } from 'lucide-react'
import type { RenderBlock, ResolvedAsset, ResolvedEntry } from '#types/site'
import { cn } from '~/lib/utils'
import SiteImage from '~/site/image'
import { Container, Section, SectionHeading } from '~/site/section'
import SmartLink from '~/site/smart_link'
import { formatDate } from '~/site/utils'

function coverOf(entry: ResolvedEntry): ResolvedAsset | null {
  const data = entry.data ?? {}
  const preferred = data.cover ?? data.image ?? data.image_id ?? data.cover_image
  if (preferred?.url) return preferred
  for (const value of Object.values(data)) {
    if (
      value &&
      typeof value === 'object' &&
      'url' in value &&
      String(value.mimeType ?? '').startsWith('image/')
    ) {
      return value as ResolvedAsset
    }
  }
  return null
}

function excerptOf(entry: ResolvedEntry) {
  const data = entry.data ?? {}
  const value = data.excerpt ?? data.summary ?? data.description
  return typeof value === 'string' ? value : null
}

function EntryLink({
  entry,
  className,
  children,
}: {
  entry: ResolvedEntry
  className?: string
  children: React.ReactNode
}) {
  if (!entry.url) return <div className={className}>{children}</div>
  return (
    <SmartLink href={entry.url} className={className}>
      {children}
    </SmartLink>
  )
}

function GridCard({ entry }: { entry: ResolvedEntry }) {
  const cover = coverOf(entry)
  const excerpt = excerptOf(entry)
  return (
    <EntryLink
      entry={entry}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-0.5 hover:shadow-lg"
    >
      {cover ? (
        <div className="aspect-[16/10] overflow-hidden bg-muted">
          <SiteImage
            asset={cover}
            sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw"
            className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        </div>
      ) : null}
      <div className="flex flex-1 flex-col p-6">
        {(entry.publishedAt || entry.category) && (
          <div className="flex flex-wrap items-center gap-x-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {entry.category && <span className="text-primary">{entry.category.title}</span>}
            {entry.category && entry.publishedAt && <span aria-hidden="true">·</span>}
            {entry.publishedAt && (
              <time dateTime={entry.publishedAt}>{formatDate(entry.publishedAt)}</time>
            )}
          </div>
        )}
        <h3 className="mt-2 text-xl font-semibold tracking-tight text-balance">{entry.title}</h3>
        {excerpt && (
          <p className="mt-3 line-clamp-3 leading-relaxed text-muted-foreground">{excerpt}</p>
        )}
        {entry.url && (
          <span className="mt-auto inline-flex items-center gap-1.5 pt-6 text-sm font-medium">
            Read more
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        )}
      </div>
    </EntryLink>
  )
}

function ListRow({ entry }: { entry: ResolvedEntry }) {
  const cover = coverOf(entry)
  const excerpt = excerptOf(entry)
  return (
    <li>
      <EntryLink
        entry={entry}
        className="group grid gap-4 py-8 sm:grid-cols-[10rem_1fr] sm:gap-8 md:grid-cols-[12rem_1fr_auto]"
      >
        <div className="text-sm text-muted-foreground sm:pt-1.5">
          {entry.publishedAt && (
            <time dateTime={entry.publishedAt}>{formatDate(entry.publishedAt)}</time>
          )}
        </div>
        <div className="min-w-0">
          <h3 className="text-2xl font-semibold tracking-tight text-balance group-hover:underline group-hover:decoration-foreground/30 group-hover:underline-offset-4">
            {entry.title}
          </h3>
          {excerpt && (
            <p className="mt-2 max-w-2xl leading-relaxed text-muted-foreground">{excerpt}</p>
          )}
          {entry.url && (
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium">
              Read article
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          )}
        </div>
        {cover && (
          <SiteImage
            asset={cover}
            sizes="200px"
            className="hidden aspect-[4/3] w-48 rounded-xl object-cover md:block"
          />
        )}
      </EntryLink>
    </li>
  )
}

function FeaturedCard({ entry }: { entry: ResolvedEntry }) {
  const cover = coverOf(entry)
  const excerpt = excerptOf(entry)
  return (
    <EntryLink
      entry={entry}
      className="group grid overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-lg md:grid-cols-2"
    >
      {cover ? (
        <div className="aspect-[16/10] overflow-hidden bg-muted md:aspect-auto md:min-h-80">
          <SiteImage
            asset={cover}
            sizes="(min-width: 768px) 50vw, 100vw"
            className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        </div>
      ) : null}
      <div
        className={cn(
          'flex flex-col justify-center p-8 md:p-12',
          !cover && 'md:col-span-2 md:max-w-3xl'
        )}
      >
        <span className="text-xs font-medium tracking-wide text-primary uppercase">Featured</span>
        {entry.publishedAt && (
          <time dateTime={entry.publishedAt} className="mt-3 text-sm text-muted-foreground">
            {formatDate(entry.publishedAt)}
          </time>
        )}
        <h3 className="mt-2 text-3xl font-semibold tracking-tight text-balance md:text-4xl">
          {entry.title}
        </h3>
        {excerpt && <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{excerpt}</p>}
        {entry.url && (
          <span className="mt-8 inline-flex items-center gap-1.5 text-sm font-medium">
            Read more
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        )}
      </div>
    </EntryLink>
  )
}

function Grid({ entries }: { entries: ResolvedEntry[] }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {entries.map((entry) => (
        <GridCard key={entry.id} entry={entry} />
      ))}
    </div>
  )
}

function Entries({ entries, layout }: { entries: ResolvedEntry[]; layout: string }) {
  if (layout === 'list') {
    return (
      <ul className="divide-y divide-border border-y border-border">
        {entries.map((entry) => (
          <ListRow key={entry.id} entry={entry} />
        ))}
      </ul>
    )
  }
  if (layout === 'featured-first' && entries.length) {
    const [first, ...rest] = entries
    return (
      <div className="grid gap-6">
        <FeaturedCard entry={first} />
        {rest.length > 0 && <Grid entries={rest} />}
      </div>
    )
  }
  return <Grid entries={entries} />
}

type Group = { key: string; label: string; entries: ResolvedEntry[] }

export default function CollectionList({
  data,
}: {
  block: RenderBlock
  data: Record<string, any>
}) {
  const entries: ResolvedEntry[] = data.entries ?? []
  const groups: Group[] | null = Array.isArray(data.groups) ? data.groups : null
  const layout = String(data.layout ?? 'grid')
  const list = layout === 'list'
  return (
    <Section>
      <Container className={cn(list && 'max-w-4xl')}>
        <SectionHeading heading={data.heading} body={data.body} />
        {entries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border px-6 py-16 text-center text-muted-foreground">
            Nothing here yet. Check back soon.
          </div>
        ) : groups ? (
          <div className="grid gap-14">
            {groups.map((group) => (
              <section key={group.key} aria-label={group.label || 'Other'}>
                <h3 className="mb-6 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                  {group.label || 'Other'}
                </h3>
                <Entries entries={group.entries} layout={layout} />
              </section>
            ))}
          </div>
        ) : (
          <Entries entries={entries} layout={layout} />
        )}
      </Container>
    </Section>
  )
}
