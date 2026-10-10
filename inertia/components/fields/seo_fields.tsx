import { useState, type ReactNode } from 'react'
import { OG_TYPES, SCHEMA_TYPES, TWITTER_CARDS, type Seo } from '#types/content'
import { Input } from '~/components/ui/input'
import { Textarea } from '~/components/ui/textarea'
import { Switch } from '~/components/ui/switch'
import { Label } from '~/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import FormField from '~/components/admin/form_field'
import AssetInput from '~/components/fields/asset_input'
import { useFields } from '~/components/fields/context'
import { errorAt } from '~/lib/errors'
import { cn } from '~/lib/utils'

const NONE = '__none'

function Counter({ value, max }: { value: string | undefined; max: number }) {
  const length = value?.length ?? 0
  return (
    <span className={cn('tabular-nums', length > max ? 'text-amber-600' : 'text-muted-foreground')}>
      {length} / {max}
    </span>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-4 p-5">
      <h3 className="text-muted-foreground text-xs font-medium">{title}</h3>
      {children}
    </section>
  )
}

function Choice({
  id,
  value,
  options,
  onChange,
}: {
  id: string
  value: string | undefined
  options: readonly { label: string; value: string }[]
  onChange: (value: string | undefined) => void
}) {
  return (
    <Select
      value={value || NONE}
      onValueChange={(next) => onChange(next === NONE ? undefined : next)}
    >
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>—</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function Toggle({
  id,
  label,
  checked,
  onChange,
}: {
  id: string
  label: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
      <Label htmlFor={id}>{label}</Label>
    </div>
  )
}

function jsonText(value: Seo['jsonLd'] | string | undefined) {
  if (value === undefined || value === null) return ''
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2)
}

function jsonProblem(text: string) {
  if (!text.trim()) return null
  try {
    const parsed = JSON.parse(text)
    const nodes = Array.isArray(parsed) ? parsed : [parsed]
    if (nodes.some((node) => !node || typeof node !== 'object' || Array.isArray(node))) {
      return 'Must be an object or a list of objects'
    }
    if (nodes.some((node) => !('@type' in node) && !Array.isArray(node['@graph']))) {
      return 'Every node needs an @type'
    }
    return null
  } catch (error) {
    return `Isn't valid JSON: ${(error as Error).message}`
  }
}

function mentions(text: string | undefined, keyword: string) {
  return !!text && text.toLowerCase().includes(keyword.toLowerCase())
}

export default function SeoFields({
  value,
  onChange,
  fallbackTitle,
  fallbackDescription,
}: {
  value: Seo
  onChange: (value: Seo) => void
  fallbackTitle?: string
  fallbackDescription?: string
}) {
  const { errors } = useFields()
  const [jsonLd, setJsonLd] = useState(() => jsonText(value.jsonLd as Seo['jsonLd']))
  const update = (changes: Partial<Seo>) => {
    const next: Seo = { ...value, ...changes }
    for (const key of Object.keys(changes)) {
      const item = next[key]
      if (item === undefined || item === '' || item === null || item === false) delete next[key]
    }
    onChange(next)
  }
  const error = (key: string) => errorAt(errors, `seo.${key}`)
  const keyword = value.focusKeyword?.trim()
  const effectiveTitle = value.title || fallbackTitle
  const localJsonProblem = jsonProblem(jsonLd)

  return (
    <div className="divide-y" data-seo-fields>
      <Section title="Search">
        <FormField
          label={
            <span className="flex w-full items-center justify-between gap-2">
              Meta title
              <Counter value={effectiveTitle} max={60} />
            </span>
          }
          htmlFor="seo-title"
          error={error('title')}
          help="Shown as the result's title. Defaults to the page title."
        >
          <Input
            id="seo-title"
            value={value.title ?? ''}
            placeholder={fallbackTitle}
            onChange={(event) => update({ title: event.target.value })}
          />
        </FormField>
        <FormField
          label={
            <span className="flex w-full items-center justify-between gap-2">
              Meta description
              <Counter value={value.description} max={160} />
            </span>
          }
          htmlFor="seo-description"
          error={error('description')}
          help="A concise summary that search engines and previews show under the title."
        >
          <Textarea
            id="seo-description"
            rows={3}
            value={value.description ?? ''}
            placeholder={fallbackDescription}
            onChange={(event) => update({ description: event.target.value })}
          />
        </FormField>
        <FormField
          label="Canonical URL"
          htmlFor="seo-canonical"
          error={error('canonicalUrl')}
          help="Leave blank to use this page's own address."
        >
          <Input
            id="seo-canonical"
            type="url"
            inputMode="url"
            placeholder="https://"
            value={value.canonicalUrl ?? ''}
            onChange={(event) => update({ canonicalUrl: event.target.value })}
          />
        </FormField>
        <FormField
          label="Focus keyword"
          htmlFor="seo-keyword"
          error={error('focusKeyword')}
          help={
            keyword ? (
              <>
                {mentions(effectiveTitle, keyword) ? 'In the title' : 'Not in the title'} ·{' '}
                {mentions(value.description, keyword)
                  ? 'in the description'
                  : 'not in the description'}
              </>
            ) : undefined
          }
        >
          <Input
            id="seo-keyword"
            value={value.focusKeyword ?? ''}
            onChange={(event) => update({ focusKeyword: event.target.value })}
          />
        </FormField>
        <Toggle
          id="seo-noindex"
          label="Hide from search engines"
          checked={Boolean(value.noindex)}
          onChange={(noindex) => update({ noindex })}
        />
        <Toggle
          id="seo-nofollow"
          label="Ask search engines not to follow links"
          checked={Boolean(value.nofollow)}
          onChange={(nofollow) => update({ nofollow })}
        />
      </Section>
      <Section title="Social sharing">
        <FormField label="Social share image" error={error('imageId')}>
          <AssetInput value={value.imageId ?? null} onChange={(imageId) => update({ imageId })} />
        </FormField>
        <FormField label="Title override" htmlFor="seo-og-title" error={error('ogTitle')}>
          <Input
            id="seo-og-title"
            value={value.ogTitle ?? ''}
            placeholder={effectiveTitle}
            onChange={(event) => update({ ogTitle: event.target.value })}
          />
        </FormField>
        <FormField
          label="Description override"
          htmlFor="seo-og-description"
          error={error('ogDescription')}
        >
          <Textarea
            id="seo-og-description"
            rows={2}
            value={value.ogDescription ?? ''}
            placeholder={value.description || fallbackDescription}
            onChange={(event) => update({ ogDescription: event.target.value })}
          />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Open Graph type" htmlFor="seo-og-type" error={error('ogType')}>
            <Choice
              id="seo-og-type"
              value={value.ogType}
              options={OG_TYPES}
              onChange={(ogType) => update({ ogType })}
            />
          </FormField>
          <FormField label="Twitter card" htmlFor="seo-twitter-card" error={error('twitterCard')}>
            <Choice
              id="seo-twitter-card"
              value={value.twitterCard}
              options={TWITTER_CARDS}
              onChange={(twitterCard) => update({ twitterCard })}
            />
          </FormField>
        </div>
      </Section>
      <Section title="Structured data">
        <FormField label="schema.org type" htmlFor="seo-schema-type" error={error('schemaType')}>
          <Choice
            id="seo-schema-type"
            value={value.schemaType}
            options={SCHEMA_TYPES}
            onChange={(schemaType) => update({ schemaType })}
          />
        </FormField>
        <FormField
          label="JSON-LD"
          htmlFor="seo-json-ld"
          error={error('jsonLd') ?? localJsonProblem ?? undefined}
          help="One node or a list of nodes, each with an @type. Leave blank to use the schema.org type above."
        >
          <Textarea
            id="seo-json-ld"
            rows={8}
            spellCheck={false}
            className="font-mono text-xs"
            placeholder={'{\n  "@type": "Organization",\n  "name": "…"\n}'}
            value={jsonLd}
            aria-invalid={Boolean(error('jsonLd') || localJsonProblem)}
            onChange={(event) => {
              setJsonLd(event.target.value)
              update({ jsonLd: (event.target.value.trim() || undefined) as Seo['jsonLd'] })
            }}
          />
        </FormField>
      </Section>
    </div>
  )
}
