import { ArrowLeft } from 'lucide-react'
import type { Field } from '#types/content'
import type { RenderBlock, ResolvedAsset, ResolvedEntry, ResolvedLink } from '#types/site'
import type { InertiaProps } from '~/types'
import Blocks from '~/site/blocks'
import SiteImage from '~/site/image'
import Markdown from '~/site/markdown'
import SeoHead from '~/site/seo_head'
import { Container } from '~/site/section'
import SmartLink from '~/site/smart_link'
import type { SiteEntryProps } from '~/site/types'
import { formatDate } from '~/site/utils'

const LEAD_NAMES = ['excerpt', 'summary', 'description', 'intro', 'subtitle']

function isImage(value: any): value is ResolvedAsset {
  return !!value?.url && String(value.mimeType ?? '').startsWith('image/')
}

function isEmpty(value: unknown) {
  if (value === null || value === undefined || value === '') return true
  if (Array.isArray(value)) return value.length === 0
  return false
}

function humanize(name: string) {
  const text = name.replace(/_/g, ' ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function FieldValue({ field, value }: { field: Field; value: any }) {
  switch (field.type) {
    case 'markdown':
    case 'richtext':
      return <Markdown source={value} />
    case 'boolean':
      return <>{value ? 'Yes' : 'No'}</>
    case 'datetime':
      return <>{formatDate(value)}</>
    case 'url':
      return (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-4"
        >
          {value}
        </a>
      )
    case 'email':
      return (
        <a href={`mailto:${value}`} className="underline underline-offset-4">
          {value}
        </a>
      )
    case 'link': {
      const link = value as ResolvedLink
      return link?.href ? (
        <SmartLink href={link.href} className="underline underline-offset-4">
          {link.label || link.href}
        </SmartLink>
      ) : null
    }
    case 'asset':
      return isImage(value) ? (
        <SiteImage asset={value} sizes="(min-width: 768px) 720px, 100vw" className="rounded-xl" />
      ) : value?.url ? (
        <a href={value.url} className="underline underline-offset-4">
          Download
        </a>
      ) : null
    case 'entry': {
      const entry = value as ResolvedEntry
      return entry?.url ? (
        <SmartLink href={entry.url} className="underline underline-offset-4">
          {entry.title}
        </SmartLink>
      ) : (
        <>{entry?.title}</>
      )
    }
    case 'form':
      return null
    case 'group':
      return <FieldList fields={field.of ?? []} data={value ?? {}} nested />
    case 'repeater':
      return (
        <div className="space-y-4">
          {(value as Record<string, any>[]).map((item, index) => (
            <div key={index} className="rounded-xl border border-border p-4">
              <FieldList fields={field.of ?? []} data={item} nested />
            </div>
          ))}
        </div>
      )
    case 'text':
      return <span className="whitespace-pre-line">{String(value)}</span>
    case 'code':
      return (
        <pre className="overflow-x-auto rounded-lg bg-muted p-4 font-mono text-sm">
          {String(value)}
        </pre>
      )
    case 'string_list':
      return (
        <ul className="list-disc space-y-1 pl-5">
          {(value as string[]).map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      )
    case 'record_refs':
      return (
        <ul className="space-y-1">
          {(value as ResolvedEntry[]).map((item) => (
            <li key={item.id}>
              {item.url ? (
                <SmartLink href={item.url} className="underline underline-offset-4">
                  {item.title}
                </SmartLink>
              ) : (
                item.title
              )}
            </li>
          ))}
        </ul>
      )
    default:
      return <>{String(value)}</>
  }
}

function FieldList({
  fields,
  data,
  nested = false,
}: {
  fields: Field[]
  data: Record<string, any>
  nested?: boolean
}) {
  const visible = fields.filter((field) => field.type !== 'blocks' && !isEmpty(data[field.name]))
  if (!visible.length) return null
  return (
    <dl className={nested ? 'space-y-3' : 'divide-y divide-border border-y border-border'}>
      {visible.map((field) => {
        const block = ['markdown', 'richtext', 'repeater', 'group', 'asset'].includes(field.type)
        return (
          <div
            key={field.name}
            className={
              nested
                ? 'grid gap-1'
                : block
                  ? 'grid gap-3 py-6'
                  : 'grid gap-1 py-4 sm:grid-cols-[12rem_1fr] sm:gap-6'
            }
          >
            <dt className="text-sm font-medium text-muted-foreground">
              {field.label || humanize(field.name)}
            </dt>
            <dd className="text-foreground">
              <FieldValue field={field} value={data[field.name]} />
            </dd>
          </div>
        )
      })}
    </dl>
  )
}

export default function SiteEntry({ entry, collection, seo, site }: InertiaProps<SiteEntryProps>) {
  const fields = collection.fields ?? []
  const data = entry.data ?? {}
  const body = fields.find(
    (field) => ['markdown', 'richtext'].includes(field.type) && field.name === 'body'
  )
  const lead = fields.find(
    (field) => LEAD_NAMES.includes(field.name) && (field.type === 'text' || field.type === 'string')
  )
  const cover = fields.find((field) => field.type === 'asset' && isImage(data[field.name]))
  const blockFields = fields.filter((field) => field.type === 'blocks')
  const used = new Set([body?.name, lead?.name, cover?.name].filter(Boolean))
  const rest = fields.filter((field) => !used.has(field.name) && field.type !== 'blocks')
  const listing = collection.urlPrefix ? `/${collection.urlPrefix}` : '/'

  return (
    <>
      <SeoHead seo={seo} site={site} type="article" />
      <article>
        <header className="border-b border-border/60 bg-gradient-to-b from-muted/60 to-background">
          <Container className="max-w-3xl pt-12 pb-12 sm:pt-16 sm:pb-16">
            <SmartLink
              href={listing}
              className="group inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
              {collection.name}
            </SmartLink>
            {entry.category && (
              <p className="mt-6 text-xs font-semibold tracking-widest text-primary uppercase">
                {entry.category.title}
              </p>
            )}
            <h1
              className={`${entry.category ? 'mt-3' : 'mt-6'} text-4xl font-semibold tracking-tight text-balance sm:text-5xl`}
            >
              {entry.title}
            </h1>
            {lead && data[lead.name] && (
              <p className="mt-5 text-xl leading-relaxed text-pretty text-muted-foreground">
                {data[lead.name]}
              </p>
            )}
            {entry.publishedAt && (
              <div className="mt-8 flex items-center gap-3 text-sm text-muted-foreground">
                <span className="flex size-9 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                  {site.name.charAt(0).toUpperCase()}
                </span>
                <div>
                  <div className="font-medium text-foreground">{site.name}</div>
                  <time dateTime={entry.publishedAt}>{formatDate(entry.publishedAt)}</time>
                </div>
              </div>
            )}
          </Container>
        </header>
        {cover && (
          <Container className="mt-10 max-w-4xl">
            <SiteImage
              asset={data[cover.name]}
              eager
              sizes="(min-width: 896px) 832px, 100vw"
              className="aspect-[16/9] w-full rounded-2xl object-cover shadow-lg"
            />
          </Container>
        )}
        {(body || entry.body || rest.length > 0) && (
          <Container className="max-w-3xl py-12 sm:py-16">
            {body && <Markdown source={data[body.name]} />}
            {entry.body && <Markdown source={entry.body} className={body ? 'mt-12' : undefined} />}
            {rest.length > 0 && (
              <div className={body || entry.body ? 'mt-12' : undefined}>
                <FieldList fields={rest} data={data} />
              </div>
            )}
          </Container>
        )}
        {entry.blocks?.length > 0 && <Blocks blocks={entry.blocks} />}
        {blockFields.map((field) => (
          <Blocks key={field.name} blocks={data[field.name] as RenderBlock[]} />
        ))}
        <Container className="max-w-3xl pb-16">
          {entry.tags && entry.tags.length > 0 && (
            <ul aria-label="Tags" className="mb-8 flex flex-wrap gap-2">
              {entry.tags.map((tag) => (
                <li
                  key={tag.id}
                  className="rounded-full border border-border bg-muted/60 px-3 py-1 text-sm text-muted-foreground"
                >
                  #{tag.title}
                </li>
              ))}
            </ul>
          )}
          <div className="border-t border-border pt-8">
            <SmartLink
              href={listing}
              className="group inline-flex items-center gap-1.5 text-sm font-medium hover:underline hover:underline-offset-4"
            >
              <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
              Back to {collection.name.toLowerCase()}
            </SmartLink>
          </div>
        </Container>
      </article>
    </>
  )
}
