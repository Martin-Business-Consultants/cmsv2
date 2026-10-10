import { useState, type FormEvent } from 'react'
import { Head, useForm } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { Plus, X } from 'lucide-react'
import type { InertiaProps } from '~/types'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Badge } from '~/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import FormField from '~/components/admin/form_field'
import SettingsShell, { SaveBox } from '~/components/settings/settings_shell'
import { languageName } from '~/components/admin/translations_postbox'
import { useCan } from '~/hooks/use_can'

type Props = InertiaProps<{
  defaultLocale: string
  locales: string[]
  counts: { pages: Record<string, number>; entries: Record<string, number> }
}>

const LOCALE = /^[a-z]{2,3}(-[a-z0-9]{2,8})*$/

function usage(counts: Props['counts'], locale: string) {
  const pages = counts.pages[locale] ?? 0
  const entries = counts.entries[locale] ?? 0
  if (!pages && !entries) return 'Not used yet'
  return [
    pages && `${pages} ${pages === 1 ? 'page' : 'pages'}`,
    entries && `${entries} ${entries === 1 ? 'entry' : 'entries'}`,
  ]
    .filter(Boolean)
    .join(', ')
}

export default function LanguagesSettings({ defaultLocale, locales, counts }: Props) {
  const can = useCan()
  const readOnly = !can('settings:write')
  const form = useForm({ locales: locales.filter((locale) => locale !== defaultLocale) })
  const [draft, setDraft] = useState('')
  const code = draft.trim().toLowerCase().replace(/_/g, '-')
  const draftError =
    code && !LOCALE.test(code)
      ? 'Use a language code such as fr, de or pt-br'
      : code && (code === defaultLocale || form.data.locales.includes(code))
        ? 'Already on the list'
        : undefined

  function add() {
    if (!code || draftError) return
    form.setData('locales', [...form.data.locales, code])
    setDraft('')
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    form.put('/admin/settings/languages', { preserveScroll: true })
  }

  const listError = Object.entries(form.errors).find(([key]) => key.startsWith('locales'))?.[1]

  return (
    <>
      <Head title="Languages" />
      <SettingsShell
        title="Languages"
        description="The languages your content is written in, and their URL prefixes."
        aside={
          <SaveBox
            form="languages-settings"
            dirty={form.isDirty}
            processing={form.processing}
            readOnly={readOnly}
            label="Save languages"
          />
        }
      >
        <form id="languages-settings" onSubmit={submit} className="grid gap-6">
          <Card className="gap-4 py-5">
            <CardHeader className="px-5">
              <CardTitle>Site languages</CardTitle>
              <CardDescription>
                Pages and entries in the default language live at their plain address. Every other
                language gets a prefix, like <code className="font-mono">/fr/about</code>. Link
                translations from the Language box in the editor.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5 px-5">
              <ul className="divide-y rounded-lg border">
                <li className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <span className="bg-muted w-12 rounded px-1.5 py-0.5 text-center font-mono text-xs uppercase">
                    {defaultLocale}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="font-medium">{languageName(defaultLocale)}</span>
                    <span className="text-muted-foreground block text-xs">
                      {usage(counts, defaultLocale)} · no URL prefix
                    </span>
                  </span>
                  <Badge variant="secondary">Default</Badge>
                  {can('settings:read') && (
                    <Link
                      href="/admin/settings/general"
                      className="text-muted-foreground hover:text-foreground text-xs underline-offset-4 hover:underline"
                    >
                      Change in General
                    </Link>
                  )}
                </li>
                {form.data.locales.map((locale) => (
                  <li key={locale} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <span className="bg-muted w-12 rounded px-1.5 py-0.5 text-center font-mono text-xs uppercase">
                      {locale}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="font-medium">{languageName(locale)}</span>
                      <span className="text-muted-foreground block text-xs">
                        {usage(counts, locale)} · served under{' '}
                        <code className="font-mono">/{locale}/</code>
                      </span>
                    </span>
                    {!readOnly && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove ${languageName(locale)}`}
                        onClick={() =>
                          form.setData(
                            'locales',
                            form.data.locales.filter((item) => item !== locale)
                          )
                        }
                      >
                        <X />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
              {listError && <p className="text-destructive text-sm">{listError}</p>}
              {!readOnly && (
                <FormField
                  label="Add a language"
                  htmlFor="new-locale"
                  error={draftError}
                  help={
                    code && !draftError
                      ? `${languageName(code)} · /${code}/`
                      : 'A language code such as fr, de, es or pt-br.'
                  }
                >
                  <div className="flex max-w-sm gap-2">
                    <Input
                      id="new-locale"
                      className="font-mono"
                      placeholder="fr"
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          add()
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={add}
                      disabled={!code || !!draftError}
                    >
                      <Plus />
                      Add
                    </Button>
                  </div>
                </FormField>
              )}
            </CardContent>
          </Card>
        </form>
      </SettingsShell>
    </>
  )
}
