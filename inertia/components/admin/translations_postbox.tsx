import { useState } from 'react'
import { router } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { Languages, Plus } from 'lucide-react'
import { Button } from '~/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import Postbox from '~/components/admin/postbox'
import FormField from '~/components/admin/form_field'
import StatusBadge from '~/components/admin/status_badge'

export type SiteLocales = { defaultLocale: string; locales: string[] }

export type TranslationLink = {
  id: number
  locale: string
  title: string
  status: string
  isLive: boolean
  publicPath: string | null
}

export function languageName(locale: string) {
  try {
    const name = new Intl.DisplayNames(['en'], { type: 'language' }).of(locale)
    return name && name !== locale ? name : locale.toUpperCase()
  } catch {
    return locale.toUpperCase()
  }
}

export function showsTranslations(
  locales: SiteLocales | undefined,
  locale: string | undefined,
  translations: TranslationLink[] | undefined
) {
  if (!locales) return false
  return (
    locales.locales.length > 1 ||
    (!!locale && locale !== locales.defaultLocale) ||
    (translations?.length ?? 0) > 0
  )
}

export default function TranslationsPostbox({
  id,
  locales,
  locale,
  onLocaleChange,
  error,
  translations,
  editHref,
  addHref,
  dirty,
  canWrite,
}: {
  id: string
  locales: SiteLocales
  locale: string
  onLocaleChange: (locale: string) => void
  error?: string
  translations: TranslationLink[]
  editHref: (id: number) => string
  addHref?: string
  dirty: boolean
  canWrite: boolean
}) {
  const options = [...new Set([...locales.locales, locale])]
  const taken = new Set([locale, ...translations.map((translation) => translation.locale)])
  const missing = locales.locales.filter((code) => !taken.has(code))
  const [target, setTarget] = useState(missing[0] ?? '')
  const [adding, setAdding] = useState(false)
  const chosen = missing.includes(target) ? target : (missing[0] ?? '')

  return (
    <Postbox id={id} title="Language">
      <FormField
        label="Language"
        htmlFor={`${id}-locale`}
        error={error}
        help={
          locale === locales.defaultLocale
            ? 'The site’s default language: no URL prefix.'
            : `Served under /${locale}/ on the public site.`
        }
      >
        <Select value={locale} onValueChange={onLocaleChange}>
          <SelectTrigger id={`${id}-locale`} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((code) => (
              <SelectItem key={code} value={code}>
                {languageName(code)} <span className="text-muted-foreground font-mono">{code}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>
      {addHref !== undefined && (
        <div className="grid gap-2">
          <span className="text-sm font-medium">Translations</span>
          {translations.length === 0 ? (
            <p className="text-muted-foreground text-xs">No translations yet.</p>
          ) : (
            <ul className="w-0 min-w-full divide-y rounded-md border">
              {translations.map((translation) => (
                <li key={translation.id} className="flex items-center gap-2 px-2.5 py-2 text-sm">
                  <span className="bg-muted text-muted-foreground w-10 shrink-0 rounded px-1 py-0.5 text-center font-mono text-[11px] uppercase">
                    {translation.locale}
                  </span>
                  <Link
                    href={editHref(translation.id)}
                    className="min-w-0 flex-1 truncate underline-offset-4 hover:underline"
                    title={`${languageName(translation.locale)}: ${translation.title}`}
                  >
                    {translation.title}
                  </Link>
                  <StatusBadge status={translation.status} live={translation.isLive} />
                </li>
              ))}
            </ul>
          )}
          {canWrite && missing.length > 0 && (
            <div className="grid gap-1.5">
              <div className="flex gap-2">
                <Select value={chosen} onValueChange={setTarget}>
                  <SelectTrigger aria-label="Translation language" className="min-w-0 flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {missing.map((code) => (
                      <SelectItem key={code} value={code}>
                        {languageName(code)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!chosen || adding}
                  onClick={() =>
                    router.post(
                      addHref,
                      { locale: chosen },
                      {
                        onStart: () => setAdding(true),
                        onFinish: () => setAdding(false),
                      }
                    )
                  }
                >
                  <Plus />
                  {adding ? 'Adding…' : 'Add translation'}
                </Button>
              </div>
              <p className="text-muted-foreground text-xs">
                {dirty
                  ? 'The copy is made from the last saved version. Save first to include your changes.'
                  : 'Creates a linked draft copy to translate.'}
              </p>
            </div>
          )}
          {missing.length === 0 && locales.locales.length > 1 && (
            <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <Languages className="size-3.5" />
              Translated into every site language.
            </p>
          )}
        </div>
      )}
    </Postbox>
  )
}
