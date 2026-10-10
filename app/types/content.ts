export const FIELD_TYPES = [
  'string',
  'text',
  'markdown',
  'code',
  'richtext',
  'integer',
  'boolean',
  'select',
  'url',
  'email',
  'datetime',
  'link',
  'asset',
  'entry',
  'record_refs',
  'string_list',
  'repeater',
  'group',
  'blocks',
] as const

export type FieldType = (typeof FIELD_TYPES)[number]

export const CODE_LANGUAGES = [
  { value: 'plain', label: 'Plain text' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'json', label: 'JSON' },
] as const

export type ShowIfValue = string | number | boolean

export type ShowIf = {
  field: string
  equals?: ShowIfValue
  not_equals?: ShowIfValue
  in?: ShowIfValue[]
  not_in?: ShowIfValue[]
}

export const SHOW_IF_COMPARATORS = ['equals', 'not_equals', 'in', 'not_in'] as const

export type Field = {
  name: string
  label?: string
  type: FieldType | (string & {})
  required?: boolean
  help?: string
  options?: string[]
  collection?: string
  allowedTypes?: string[]
  language?: string
  of?: Field[]
  sidebar?: boolean
  tab?: string
  showIf?: ShowIf
}

export const TYPE_SETTINGS: Record<string, string[]> = {
  select: ['options'],
  entry: ['collection'],
  record_refs: ['collection'],
  code: ['language'],
  blocks: ['allowedTypes'],
  repeater: ['of'],
  group: ['of'],
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const RENAMED_KEYS: Record<string, string> = {
  of_collection: 'collection',
  allowed_types: 'allowedTypes',
  show_if: 'showIf',
}

const ALL_SETTINGS = new Set(Object.values(TYPE_SETTINGS).flat())

export function normalizeDefinitions(fields: unknown): Field[] {
  if (!Array.isArray(fields)) return fields as Field[]
  return fields.map((field) => {
    if (!isPlainObject(field)) return field
    const out: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(field)) {
      const target = RENAMED_KEYS[key] ?? key
      if (target in out && key !== target) continue
      out[target] = value
    }
    if (out.type === 'record_ref') out.type = 'entry'
    const keep = new Set(TYPE_SETTINGS[String(out.type)] ?? [])
    for (const key of Object.keys(out)) {
      if (ALL_SETTINGS.has(key) && !keep.has(key)) delete out[key]
    }
    for (const key of ['help', 'tab', 'collection', 'label']) {
      if (typeof out[key] === 'string') out[key] = (out[key] as string).trim()
      if (out[key] === '') delete out[key]
    }
    if (out.sidebar !== true) delete out.sidebar
    if (out.required !== true) delete out.required
    if (out.showIf === null || out.showIf === '') delete out.showIf
    if (typeof out.showIf === 'string') {
      try {
        out.showIf = JSON.parse(out.showIf)
      } catch {}
    }
    if (Array.isArray(out.options)) {
      out.options = out.options.map((option) => String(option).trim()).filter(Boolean)
    }
    if (Array.isArray(out.of)) out.of = normalizeDefinitions(out.of)
    return out as Field
  })
}

export function showIfMet(rule: ShowIf | undefined | null, values: Record<string, unknown>) {
  if (!rule || typeof rule !== 'object' || !rule.field) return true
  const raw = values?.[rule.field]
  const current = raw === undefined || raw === null ? '' : String(raw)
  const same = (other: unknown) => current === String(other)
  if ('equals' in rule) return same(rule.equals)
  if ('not_equals' in rule) return !same(rule.not_equals)
  if (Array.isArray(rule.in)) return rule.in.some(same)
  if (Array.isArray(rule.not_in)) return !rule.not_in.some(same)
  return true
}

export type FieldData = Record<string, any>

export type RichTextDoc = {
  type: 'doc'
  content?: Record<string, any>[]
}

export type LinkValue = {
  kind: 'url' | 'page' | 'entry'
  value: string
  label?: string
}

export type Block = {
  id: string
  type: string
  version?: number
  data: FieldData
}

export type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

export type JsonLdNode = { [key: string]: JsonValue }

export type Seo = {
  title?: string
  description?: string
  canonicalUrl?: string
  focusKeyword?: string
  noindex?: boolean
  nofollow?: boolean
  imageId?: number | null
  ogTitle?: string
  ogDescription?: string
  ogType?: string
  twitterCard?: string
  schemaType?: string
  jsonLd?: JsonLdNode | JsonLdNode[] | null
  [key: string]: JsonValue | undefined
}

export const STATUSES = ['draft', 'published', 'archived'] as const

export type Status = (typeof STATUSES)[number]

export const OG_TYPES = [
  { label: 'Article', value: 'article' },
  { label: 'Product', value: 'product' },
  { label: 'Profile', value: 'profile' },
  { label: 'Video', value: 'video.other' },
  { label: 'Website', value: 'website' },
] as const

export const TWITTER_CARDS = [
  { label: 'App', value: 'app' },
  { label: 'Player', value: 'player' },
  { label: 'Summary', value: 'summary' },
  { label: 'Summary, large image', value: 'summary_large_image' },
] as const

export const SCHEMA_TYPES = [
  { label: 'Article', value: 'Article' },
  { label: 'Blog posting', value: 'BlogPosting' },
  { label: 'Event', value: 'Event' },
  { label: 'FAQ page', value: 'FAQPage' },
  { label: 'How-to', value: 'HowTo' },
  { label: 'Local business', value: 'LocalBusiness' },
  { label: 'News article', value: 'NewsArticle' },
  { label: 'Product', value: 'Product' },
  { label: 'Recipe', value: 'Recipe' },
  { label: 'WebPage (default)', value: 'WebPage' },
] as const

export type AssetVariant = {
  width: number
  key: string
}

export type BlockTypeOption = {
  slug: string
  label: string
  category: string | null
  description: string | null
  icon: string | null
  fields: Field[]
  defaults: FieldData
  deprecated?: boolean
  builtIn?: boolean
  version?: number
}

export type AssetOption = {
  id: number
  filename: string
  url: string
  isImage: boolean
  width: number | null
  height: number | null
  alt: string | null
}

export type PageOption = { id: number; title: string; path: string }

export type EntryOption = { id: number; title: string; collection: string; collectionName: string }

export type CollectionOption = { slug: string; name: string }

export type FieldTypeOption = { type: string; label: string }

export const BUILD_INLINE_TYPES = ['boolean', 'select', 'string', 'integer', 'url', 'datetime']

export type BuildConfig = {
  field?: string
  off_label?: string
  on_label?: string
  card_fields?: string[]
  also_fields?: string[]
  also_publish?: boolean
}

export const NOTIFICATION_EVENTS = [
  'entry.created',
  'entry.updated',
  'entry.published',
  'entry.unpublished',
  'entry.deleted',
] as const

export type NotificationEvent = (typeof NOTIFICATION_EVENTS)[number]
