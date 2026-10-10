import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from 'react'
import { Head, useForm } from '@inertiajs/react'
import { Bell, Search } from 'lucide-react'
import {
  APPEARANCES,
  BRAND_BRIEF_FIELDS,
  FONTS,
  HEX_COLOR,
  RADII,
  SHADOWS,
  brandingTokens,
  googleFontUrl,
  type Appearance,
  type BrandBrief,
  type BrandBriefField,
  type BrandFont,
  type BrandRadius,
  type BrandShadow,
} from '#types/branding'
import type { InertiaProps } from '~/types'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Textarea } from '~/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import FormField from '~/components/admin/form_field'
import Postbox from '~/components/admin/postbox'
import AssetInput from '~/components/fields/asset_input'
import { AppearancePicker } from '~/components/admin/theme_toggle'
import SettingsShell, { SaveBox } from '~/components/settings/settings_shell'
import { useCan } from '~/hooks/use_can'

type BrandingForm = {
  logoAssetId: number | null
  faviconAssetId: number | null
  primaryColor: string
  secondaryColor: string
  font: BrandFont | ''
  borderRadius: BrandRadius | ''
  boxShadow: BrandShadow | ''
  defaultAppearance: Appearance
}

type Props = InertiaProps<{
  workspace: boolean
  mediaLibrary: boolean
  branding: {
    logoAssetId: number | null
    faviconAssetId: number | null
    primaryColor: string | null
    secondaryColor: string | null
    font: BrandFont | null
    borderRadius: BrandRadius | null
    boxShadow: BrandShadow | null
    defaultAppearance: Appearance
  } | null
  brief: BrandBrief | null
}>

const TABS = ['appearance', 'identity', 'brand-context'] as const
type Tab = (typeof TABS)[number]

const DEFAULT_FONT =
  '"Inter", "InterVariable", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI Variable Text", "Segoe UI", "Adwaita Sans", "Noto Sans", Helvetica, Arial, sans-serif'

function tint(lightness: string) {
  return `oklch(from var(--neutral-tint) ${lightness} min(calc(c * 0.25), 0.03) h)`
}

const DEFAULT_TOKENS: Record<string, string> = {
  '--neutral-tint': 'oklch(50% 0 0)',
  '--accent-50': tint('95.5%'),
  '--accent-100': tint('92%'),
  '--accent-200': tint('86%'),
  '--accent-300': tint('78%'),
  '--accent-400': tint('62%'),
  '--accent-500': tint('44%'),
  '--accent-600': tint('21%'),
  '--accent-700': tint('15%'),
  '--accent-800': tint('12%'),
  '--accent-900': tint('9%'),
  '--on-accent': '#fff',
  '--font-sans': DEFAULT_FONT,
  '--radius-sm': 'calc(0.625rem - 4px)',
  '--radius-md': 'calc(0.625rem - 2px)',
  '--radius-lg': '0.625rem',
  '--radius-xl': 'calc(0.625rem + 4px)',
  '--shadow-surface': '0 0 #0000',
  '--shadow-overlay':
    '0 0 0 1px rgb(0 0 0 / 0.04), 0 10px 16px rgb(0 0 0 / 0.08), 0 2px 6px rgb(0 0 0 / 0.12)',
}

function humanize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function readTab(): Tab {
  const hash = window.location.hash.replace('#', '')
  return (TABS as readonly string[]).includes(hash) ? (hash as Tab) : 'appearance'
}

function useFontPreview(font: string) {
  useEffect(() => {
    const href = googleFontUrl(font || null)
    if (!href) return
    const id = `font-preview-${font.replace(/\s+/g, '-').toLowerCase()}`
    if (document.getElementById(id)) return
    const link = document.createElement('link')
    link.id = id
    link.rel = 'stylesheet'
    link.href = href
    document.head.appendChild(link)
  }, [font])
}

function ColorField({
  id,
  label,
  hint,
  placeholder,
  value,
  error,
  onChange,
}: {
  id: string
  label: string
  hint: string
  placeholder: string
  value: string
  error?: string
  onChange: (value: string) => void
}) {
  const valid = HEX_COLOR.test(value)
  const swatch = valid
    ? value.length === 4
      ? `#${[...value.slice(1)].map((digit) => digit + digit).join('')}`
      : value
    : placeholder
  return (
    <FormField label={label} htmlFor={id} error={error} help={hint}>
      <div className="flex items-center gap-2">
        <label
          className="relative size-9 shrink-0 cursor-pointer overflow-hidden rounded-md border shadow-xs"
          style={{ background: valid ? value : 'transparent' }}
          title={`Pick the ${label.toLowerCase()}`}
        >
          <input
            type="color"
            value={swatch}
            onChange={(event) => onChange(event.target.value)}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
            aria-label={`Pick the ${label.toLowerCase()}`}
          />
          {!valid && (
            <span className="from-muted to-background absolute inset-0 bg-gradient-to-br" />
          )}
        </label>
        <Input
          id={id}
          value={value}
          placeholder={placeholder}
          className="font-mono"
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </FormField>
  )
}

function Preview({ values, siteName }: { values: BrandingForm; siteName: string }) {
  useFontPreview(values.font)
  const style = useMemo(() => {
    const tokens = { ...DEFAULT_TOKENS }
    for (const [name, value] of brandingTokens({
      primaryColor: HEX_COLOR.test(values.primaryColor) ? values.primaryColor : null,
      secondaryColor: HEX_COLOR.test(values.secondaryColor) ? values.secondaryColor : null,
      font: values.font || null,
      borderRadius: values.borderRadius || null,
      boxShadow: values.boxShadow || null,
      defaultAppearance: values.defaultAppearance,
    })) {
      tokens[name] = value
    }
    return tokens as CSSProperties
  }, [values])

  return (
    <Postbox id="branding-preview" title="Live preview">
      <div
        style={style}
        className="brand-scope bg-background text-foreground grid gap-4 rounded-lg border p-4 font-sans"
        data-branding-preview
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold">{siteName}</span>
          <span className="text-muted-foreground flex items-center gap-1">
            <Search className="size-4" />
            <Bell className="size-4" />
          </span>
        </div>
        <div className="bg-card text-card-foreground grid gap-2 rounded-xl border p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Spring menu launch</span>
            <Badge>Published</Badge>
          </div>
          <p className="text-muted-foreground text-xs">
            Panels take the corners and the surface shadow.
          </p>
          <Input placeholder="Search entries…" className="h-8 text-xs" />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" type="button">
              Publish
            </Button>
            <Button size="sm" variant="outline" type="button">
              Preview
            </Button>
            <Button size="sm" variant="ghost" type="button" className="text-primary">
              A link
            </Button>
          </div>
        </div>
        <div className="bg-popover text-popover-foreground grid gap-1 rounded-md border p-1 text-xs shadow-md">
          <span className="bg-accent rounded-sm px-2 py-1.5">Menus and dialogs float</span>
          <span className="px-2 py-1.5">on the overlay shadow</span>
        </div>
        <div className="flex gap-1">
          {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((step) => (
            <span
              key={step}
              title={`--accent-${step}`}
              className="h-5 flex-1 rounded-sm"
              style={{ background: `var(--accent-${step})` }}
            />
          ))}
        </div>
      </div>
    </Postbox>
  )
}

function IdentityForm({
  branding,
  mediaLibrary,
  readOnly,
  siteName,
}: {
  branding: NonNullable<Props['branding']>
  mediaLibrary: boolean
  readOnly: boolean
  siteName: string
}) {
  const form = useForm<BrandingForm>({
    logoAssetId: branding.logoAssetId,
    faviconAssetId: branding.faviconAssetId,
    primaryColor: branding.primaryColor ?? '',
    secondaryColor: branding.secondaryColor ?? '',
    font: branding.font ?? '',
    borderRadius: branding.borderRadius ?? '',
    boxShadow: branding.boxShadow ?? '',
    defaultAppearance: branding.defaultAppearance,
  })

  function submit(event: FormEvent) {
    event.preventDefault()
    form.transform((data) => ({
      ...data,
      primaryColor: data.primaryColor.trim() || null,
      secondaryColor: data.secondaryColor.trim() || null,
      font: data.font || null,
      borderRadius: data.borderRadius || null,
      boxShadow: data.boxShadow || null,
    }))
    form.put('/admin/settings/branding', { preserveScroll: true })
  }

  function choice<T extends string>(
    id: keyof BrandingForm,
    options: { value: T; label: string }[]
  ) {
    return (
      <Select
        value={(form.data[id] as string) || 'default'}
        onValueChange={(value) => form.setData(id, (value === 'default' ? '' : value) as never)}
        disabled={readOnly}
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="default">Default</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <form id="branding-identity" onSubmit={submit} className="grid gap-6">
        <fieldset disabled={readOnly} className="contents">
          <Card id="identity">
            <CardHeader>
              <CardTitle>Identity</CardTitle>
              <CardDescription>
                The logo, color and type flow into the public site. The admin uses the color and
                font too.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {mediaLibrary ? (
                <div className="grid items-start gap-5 sm:grid-cols-2">
                  <FormField
                    label="Logo"
                    error={form.errors.logoAssetId}
                    help="SVG or PNG from the media library. Shown in the admin menu, the sign-in page, emails and the site header."
                  >
                    <AssetInput
                      value={form.data.logoAssetId}
                      onChange={(value) => form.setData('logoAssetId', value)}
                    />
                  </FormField>
                  <FormField
                    label="Favicon"
                    error={form.errors.faviconAssetId}
                    help="Square works best; resized for browsers and the home screen (180 px)."
                  >
                    <AssetInput
                      value={form.data.faviconAssetId}
                      onChange={(value) => form.setData('faviconAssetId', value)}
                    />
                  </FormField>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  A logo and favicon need a media library to keep them in: turn on the Media plugin.
                </p>
              )}
            </CardContent>
          </Card>

          <Card id="color">
            <CardHeader>
              <CardTitle>Color</CardTitle>
            </CardHeader>
            <CardContent className="grid items-start gap-5 sm:grid-cols-2">
              <ColorField
                id="primaryColor"
                label="Primary color"
                hint="Buttons, links, focus and what’s current. Black when blank."
                placeholder="#b45309"
                value={form.data.primaryColor}
                error={form.errors.primaryColor}
                onChange={(value) => form.setData('primaryColor', value)}
              />
              <ColorField
                id="secondaryColor"
                label="Secondary color"
                hint="Tints the grays: surfaces, lines and text. Neutral when blank."
                placeholder="#1c1917"
                value={form.data.secondaryColor}
                error={form.errors.secondaryColor}
                onChange={(value) => form.setData('secondaryColor', value)}
              />
            </CardContent>
          </Card>

          <Card id="type">
            <CardHeader>
              <CardTitle>Type and surface</CardTitle>
            </CardHeader>
            <CardContent className="grid items-start gap-5 sm:grid-cols-3">
              <FormField
                label="Font"
                htmlFor="font"
                error={form.errors.font}
                help="Every word in the admin and the site."
              >
                {choice(
                  'font',
                  (Object.keys(FONTS) as BrandFont[]).map((font) => ({
                    value: font,
                    label: `${font} — ${FONTS[font]}`,
                  }))
                )}
              </FormField>
              <FormField
                label="Corners"
                htmlFor="borderRadius"
                error={form.errors.borderRadius}
                help="Buttons, fields, panels and menus."
              >
                {choice(
                  'borderRadius',
                  RADII.map((value) => ({ value, label: humanize(value) }))
                )}
              </FormField>
              <FormField
                label="Shadow"
                htmlFor="boxShadow"
                error={form.errors.boxShadow}
                help="Under panels, and under what floats: menus, dialogs."
              >
                {choice(
                  'boxShadow',
                  SHADOWS.map((value) => ({ value, label: humanize(value) }))
                )}
              </FormField>
            </CardContent>
          </Card>

          <Card id="default-appearance">
            <CardHeader>
              <CardTitle>Default appearance</CardTitle>
              <CardDescription>
                What the admin looks like for someone who hasn’t picked light or dark yet.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField htmlFor="defaultAppearance" error={form.errors.defaultAppearance}>
                <Select
                  value={form.data.defaultAppearance}
                  onValueChange={(value) => form.setData('defaultAppearance', value as Appearance)}
                  disabled={readOnly}
                >
                  <SelectTrigger id="defaultAppearance" className="w-full sm:w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {APPEARANCES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {value === 'system' ? 'Follow the system' : humanize(value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </CardContent>
          </Card>
        </fieldset>
      </form>
      <div className="grid gap-4 xl:sticky xl:top-16">
        <SaveBox
          form="branding-identity"
          dirty={form.isDirty}
          processing={form.processing}
          readOnly={readOnly}
          label="Save branding"
        />
        <Preview values={form.data} siteName={siteName} />
      </div>
    </div>
  )
}

function BrandContextForm({ brief, readOnly }: { brief: BrandBrief; readOnly: boolean }) {
  const form = useForm<BrandBrief>({ ...brief })

  function submit(event: FormEvent) {
    event.preventDefault()
    form.put('/admin/settings/brand', { preserveScroll: true })
  }

  return (
    <Card id="brand-context">
      <CardHeader>
        <CardTitle>Brand context</CardTitle>
        <CardDescription>
          A short brief describing how this workspace writes. Nothing in the CMS renders it — it’s
          published for agents working through the API, so they write in your voice instead of a
          generic one. Leave a field blank to omit it.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-5">
          <fieldset disabled={readOnly} className="contents">
            {(Object.keys(BRAND_BRIEF_FIELDS) as BrandBriefField[]).map((field) => (
              <FormField
                key={field}
                label={BRAND_BRIEF_FIELDS[field].label}
                htmlFor={field}
                help={BRAND_BRIEF_FIELDS[field].hint}
                error={form.errors[field]}
              >
                <Textarea
                  id={field}
                  rows={4}
                  value={form.data[field]}
                  onChange={(event) => form.setData(field, event.target.value)}
                />
              </FormField>
            ))}
            {!readOnly && (
              <div className="flex items-center gap-3">
                <Button type="submit" disabled={form.processing}>
                  {form.processing ? 'Saving…' : 'Save brand context'}
                </Button>
                {form.isDirty && (
                  <span className="text-muted-foreground text-xs">You have unsaved changes.</span>
                )}
              </div>
            )}
          </fieldset>
        </form>
      </CardContent>
    </Card>
  )
}

export default function BrandingPage({ workspace, mediaLibrary, branding, brief, brand }: Props) {
  const can = useCan()
  const readOnly = !can('settings:write')
  const [tab, setTab] = useState<Tab>(readTab)

  useEffect(() => {
    const onHash = () => setTab(readTab())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  function change(value: string) {
    setTab(value as Tab)
    window.history.replaceState(window.history.state, '', `#${value}`)
  }

  return (
    <>
      <Head title="Branding" />
      <SettingsShell
        wide
        title="Branding"
        description="How things look and sound: appearance, logo, colors, type and brand context."
      >
        <Tabs value={tab} onValueChange={change} className="gap-6">
          <TabsList>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            {workspace && <TabsTrigger value="identity">Visual identity</TabsTrigger>}
            {workspace && <TabsTrigger value="brand-context">Brand context</TabsTrigger>}
          </TabsList>
          <TabsContent value="appearance">
            <Card id="appearance">
              <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>
                  Light, dark, or follow the system. Applies to this browser only.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AppearancePicker />
              </CardContent>
            </Card>
          </TabsContent>
          {workspace && branding && (
            <TabsContent value="identity">
              <IdentityForm
                branding={branding}
                mediaLibrary={mediaLibrary}
                readOnly={readOnly}
                siteName={brand.siteName}
              />
            </TabsContent>
          )}
          {workspace && brief && (
            <TabsContent value="brand-context">
              <BrandContextForm brief={brief} readOnly={readOnly} />
            </TabsContent>
          )}
        </Tabs>
      </SettingsShell>
    </>
  )
}
