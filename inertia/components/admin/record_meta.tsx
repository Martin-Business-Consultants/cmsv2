import TaxonomyPostbox, {
  hasTaxonomy,
  taxonomyInitial,
  type TaxonomyEditor,
  type TermInput,
} from '~/components/admin/taxonomy_postbox'
import TranslationsPostbox, {
  showsTranslations,
  type SiteLocales,
  type TranslationLink,
} from '~/components/admin/translations_postbox'
import { useCan } from '~/hooks/use_can'
import { errorAt, type Errors } from '~/lib/errors'

export type RecordMeta = {
  taxonomy?: TaxonomyEditor
  locales?: SiteLocales
  translations?: TranslationLink[]
  addTranslationHref?: string
  translationHref?: (id: number) => string
}

export type RecordMetaData = {
  locale?: string
  category?: TermInput | null
  tags?: TermInput[]
}

export function recordMetaInitial(meta: RecordMeta | undefined, locale?: string): RecordMetaData {
  if (!meta) return {}
  const taxonomy = meta.taxonomy && (meta.taxonomy.categories || meta.taxonomy.tags)
  return {
    locale: locale ?? meta.locales?.defaultLocale,
    ...(taxonomy ? taxonomyInitial(meta.taxonomy) : {}),
  }
}

export function localePrefix(meta: RecordMeta | undefined, locale: string | undefined) {
  if (!meta?.locales || !locale || locale === meta.locales.defaultLocale) return ''
  return `/${locale}`
}

export default function RecordMetaPostboxes({
  kind,
  meta,
  data,
  onChange,
  errors,
  dirty,
}: {
  kind: 'page' | 'entry'
  meta: RecordMeta | undefined
  data: RecordMetaData
  onChange: (changes: RecordMetaData) => void
  errors: Errors
  dirty: boolean
}) {
  const can = useCan()
  if (!meta) return null
  const canSetUp = kind === 'page' && can('collections:write')
  const locale = data.locale ?? meta.locales?.defaultLocale ?? 'en'

  return (
    <>
      {meta.locales && showsTranslations(meta.locales, locale, meta.translations) && (
        <TranslationsPostbox
          id={`${kind}-language`}
          locales={meta.locales}
          locale={locale}
          onLocaleChange={(next) => onChange({ locale: next })}
          error={errorAt(errors, 'locale')}
          translations={meta.translations ?? []}
          editHref={meta.translationHref ?? (() => '#')}
          addHref={meta.addTranslationHref}
          dirty={dirty}
          canWrite={can(kind === 'page' ? 'pages:write' : 'entries:write')}
        />
      )}
      {meta.taxonomy && hasTaxonomy(meta.taxonomy, canSetUp) && (
        <TaxonomyPostbox
          id={`${kind}-taxonomy`}
          taxonomy={meta.taxonomy}
          value={{ category: data.category ?? null, tags: data.tags ?? [] }}
          onChange={(value) => onChange(value)}
          errors={{ category: errorAt(errors, 'category'), tags: errorAt(errors, 'tags') }}
        />
      )}
    </>
  )
}
