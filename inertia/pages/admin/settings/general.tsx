import { useState, type FormEvent, type ReactNode } from 'react'
import { Head, useForm } from '@inertiajs/react'
import { Check, ChevronsUpDown } from 'lucide-react'
import type { InertiaProps } from '~/types'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Textarea } from '~/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '~/components/ui/command'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import FormField from '~/components/admin/form_field'
import SettingsShell, { SaveBox } from '~/components/settings/settings_shell'
import { useCan } from '~/hooks/use_can'
import { cn } from '~/lib/utils'

type Settings = {
  siteName: string
  tagline: string
  defaultLocale: string
  timezone: string
  siteBaseUrl: string
  publicOrigins: string[]
  contactEmail: string
  phone: string
  addressLine1: string
  city: string
  state: string
  zip: string
  emailFromName: string
  emailFromAddress: string
  homePageId: number | null
  headScripts: string
}

type Props = InertiaProps<{
  settings: Settings
  serverTimeZone: string
  timeZones: { value: string; label: string }[]
  pages: { id: number; title: string; path: string }[]
}>

function Section({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">{children}</CardContent>
    </Card>
  )
}

function TimeZoneSelect({
  value,
  options,
  serverTimeZone,
  disabled,
  onChange,
}: {
  value: string
  options: { value: string; label: string }[]
  serverTimeZone: string
  disabled?: boolean
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const selected = options.find((option) => option.value === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id="timezone"
          type="button"
          variant="outline"
          role="combobox"
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          <span className={cn('truncate', !selected && 'text-muted-foreground')}>
            {selected ? selected.label : `Server’s zone (${serverTimeZone})`}
          </span>
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] min-w-80 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search time zones…" />
          <CommandList>
            <CommandEmpty>No time zone found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value={`server ${serverTimeZone}`}
                onSelect={() => {
                  onChange('')
                  setOpen(false)
                }}
              >
                <span className="flex-1">Server’s zone ({serverTimeZone})</span>
                <Check className={cn(value ? 'opacity-0' : 'opacity-100')} />
              </CommandItem>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => {
                    onChange(option.value)
                    setOpen(false)
                  }}
                >
                  <span className="flex-1 truncate">{option.label}</span>
                  <Check className={cn(value === option.value ? 'opacity-100' : 'opacity-0')} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export default function GeneralSettings({ settings, serverTimeZone, timeZones, pages }: Props) {
  const can = useCan()
  const readOnly = !can('settings:write')
  const form = useForm({
    siteName: settings.siteName,
    tagline: settings.tagline,
    defaultLocale: settings.defaultLocale,
    timezone: settings.timezone,
    siteBaseUrl: settings.siteBaseUrl,
    publicOrigins: settings.publicOrigins.join('\n'),
    contactEmail: settings.contactEmail,
    phone: settings.phone,
    addressLine1: settings.addressLine1,
    city: settings.city,
    state: settings.state,
    zip: settings.zip,
    emailFromName: settings.emailFromName,
    emailFromAddress: settings.emailFromAddress,
    homePageId: settings.homePageId,
    headScripts: settings.headScripts,
  })
  const homePage = pages.find((page) => page.path === 'home')

  function submit(event: FormEvent) {
    event.preventDefault()
    form.put('/admin/settings/general', { preserveScroll: true })
  }

  function text(name: Exclude<keyof typeof form.data, 'homePageId'>) {
    return {
      id: name,
      value: form.data[name],
      onChange: (event: { target: { value: string } }) => form.setData(name, event.target.value),
    }
  }

  return (
    <>
      <Head title="General settings" />
      <SettingsShell
        title="General"
        description="Business name, contact details, public URL, time zone and email sender."
        aside={
          <SaveBox
            form="general-settings"
            dirty={form.isDirty}
            processing={form.processing}
            readOnly={readOnly}
            label="Save settings"
          />
        }
      >
        <form id="general-settings" onSubmit={submit} className="grid gap-6">
          <fieldset disabled={readOnly} className="contents">
            <Section
              title="Identity"
              description="Site title and description used as defaults across SEO, headers, and emails."
            >
              <FormField
                label="Business name"
                htmlFor="siteName"
                error={form.errors.siteName}
                required
              >
                <Input {...text('siteName')} />
              </FormField>
              <FormField
                label="Tagline / description"
                htmlFor="tagline"
                error={form.errors.tagline}
              >
                <Textarea rows={2} {...text('tagline')} />
              </FormField>
              <div className="grid items-start gap-5 sm:grid-cols-2">
                <FormField
                  label="Default locale"
                  htmlFor="defaultLocale"
                  error={form.errors.defaultLocale}
                >
                  <Input placeholder="en" {...text('defaultLocale')} />
                </FormField>
                <FormField
                  label="Time zone"
                  htmlFor="timezone"
                  error={form.errors.timezone}
                  help={`The admin shows and reads every time in this zone: schedules, timestamps, logs. Blank uses the server’s (${serverTimeZone}).`}
                >
                  <TimeZoneSelect
                    value={form.data.timezone}
                    options={timeZones}
                    serverTimeZone={serverTimeZone}
                    disabled={readOnly}
                    onChange={(value) => form.setData('timezone', value)}
                  />
                </FormField>
              </div>
              <FormField
                label="Site base URL"
                htmlFor="siteBaseUrl"
                error={form.errors.siteBaseUrl}
                help="Canonical public-site origin (no trailing slash). Used for sitemap.xml and anywhere absolute URLs are needed. Falls back to the request host when blank."
              >
                <Input type="url" placeholder="https://www.example.com" {...text('siteBaseUrl')} />
              </FormField>
              <FormField
                label="Additional public origins"
                htmlFor="publicOrigins"
                error={form.errors.publicOrigins}
                help="One origin per line. Allows CORS for form submissions from these domains (preview, www/apex, staging). The Site base URL above is always allowed."
              >
                <Textarea
                  rows={3}
                  className="font-mono text-xs"
                  placeholder={'https://www.example.com\nhttps://preview.example.com'}
                  {...text('publicOrigins')}
                />
              </FormField>
            </Section>

            <Section
              title="Contact"
              description="Surfaces on the public site footer, contact pages, and SEO structured data."
            >
              <div className="grid items-start gap-5 sm:grid-cols-2">
                <FormField label="Phone" htmlFor="phone" error={form.errors.phone}>
                  <Input type="tel" placeholder="(269) 555-1234" {...text('phone')} />
                </FormField>
                <FormField label="Email" htmlFor="contactEmail" error={form.errors.contactEmail}>
                  <Input type="email" placeholder="hello@example.com" {...text('contactEmail')} />
                </FormField>
              </div>
              <FormField label="Address" htmlFor="addressLine1" error={form.errors.addressLine1}>
                <Input placeholder="717 E. Bridge Street" {...text('addressLine1')} />
              </FormField>
              <div className="grid items-start gap-5 sm:grid-cols-3">
                <FormField label="City" htmlFor="city" error={form.errors.city}>
                  <Input {...text('city')} />
                </FormField>
                <FormField label="State" htmlFor="state" error={form.errors.state}>
                  <Input {...text('state')} />
                </FormField>
                <FormField label="Zip" htmlFor="zip" error={form.errors.zip}>
                  <Input {...text('zip')} />
                </FormField>
              </div>
            </Section>

            <Section
              title="Email sender"
              description="Who the CMS’s notification emails come from. Blank uses the Forms plugin’s sender, then the install’s default."
            >
              <div className="grid items-start gap-5 sm:grid-cols-2">
                <FormField
                  label="From name"
                  htmlFor="emailFromName"
                  error={form.errors.emailFromName}
                >
                  <Input placeholder="Acme" {...text('emailFromName')} />
                </FormField>
                <FormField
                  label="From address"
                  htmlFor="emailFromAddress"
                  error={form.errors.emailFromAddress}
                >
                  <Input
                    type="email"
                    placeholder="notifications@example.com"
                    {...text('emailFromAddress')}
                  />
                </FormField>
              </div>
            </Section>

            <Section title="Home page" description="What visitors see at the root of the site.">
              <FormField
                label="Home page"
                error={form.errors.homePageId}
                help={
                  homePage
                    ? `If unset, the page at /home ("${homePage.title}") is the home page.`
                    : 'If unset, the page with the path "home" is the home page.'
                }
              >
                <Select
                  value={form.data.homePageId ? String(form.data.homePageId) : 'none'}
                  onValueChange={(value) =>
                    form.setData('homePageId', value === 'none' ? null : Number(value))
                  }
                  disabled={readOnly}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Default (the page at /home)</SelectItem>
                    {pages.map((page) => (
                      <SelectItem key={page.id} value={String(page.id)}>
                        {page.title}
                        <span className="text-muted-foreground font-mono text-xs">
                          /{page.path}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </Section>

            <Section
              title="Head scripts"
              description="Added to the <head> of every public page, e.g. analytics."
            >
              <FormField
                error={form.errors.headScripts}
                help="Only paste code from sources you trust."
              >
                <Textarea
                  rows={6}
                  className="font-mono text-xs"
                  placeholder='<script async src="https://…"></script>'
                  {...text('headScripts')}
                />
              </FormField>
            </Section>
          </fieldset>
        </form>
      </SettingsShell>
    </>
  )
}
