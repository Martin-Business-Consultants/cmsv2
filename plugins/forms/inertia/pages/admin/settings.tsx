import { Head, useForm } from '@inertiajs/react'
import { ShieldCheck } from 'lucide-react'
import type { InertiaProps } from '~/types'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio_group'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import PageHeader from '~/components/admin/page_header'
import FormField from '~/components/admin/form_field'
import { useCan } from '~/hooks/use_can'
import type { CaptchaProvider, FormsSettingsView } from '../../../app/types'

type Props = InertiaProps<{ settings: FormsSettingsView }>

const PROVIDERS: { value: CaptchaProvider; label: string; description: string }[] = [
  {
    value: 'none',
    label: 'Honeypot only',
    description: 'A hidden field catches simple bots. No keys needed.',
  },
  {
    value: 'turnstile',
    label: 'Cloudflare Turnstile',
    description: 'A privacy-friendly check, usually invisible to people.',
  },
  {
    value: 'recaptcha',
    label: 'Google reCAPTCHA v2',
    description: 'The “I’m not a robot” checkbox.',
  },
]

export default function FormsSettings({ settings }: Props) {
  const can = useCan()
  const editable = can('settings:write')
  const form = useForm({
    fromName: settings.fromName,
    fromEmail: settings.fromEmail,
    defaultRecipients: settings.defaultRecipients,
    captchaProvider: settings.captchaProvider,
    turnstileSiteKey: settings.turnstileSiteKey,
    turnstileSecretKey: '',
    recaptchaSiteKey: settings.recaptchaSiteKey,
    recaptchaSecretKey: '',
    spamRetentionDays: settings.spamRetentionDays,
  })

  function submit(event: React.FormEvent) {
    event.preventDefault()
    form.put('/admin/settings/forms', {
      preserveScroll: true,
      onSuccess: () =>
        form.setData((data) => ({ ...data, turnstileSecretKey: '', recaptchaSecretKey: '' })),
    })
  }

  const keyFields = (provider: 'turnstile' | 'recaptcha') => {
    const mask =
      provider === 'turnstile' ? settings.turnstileSecretMask : settings.recaptchaSecretMask
    const siteKey = `${provider}SiteKey` as const
    const secretKey = `${provider}SecretKey` as const
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Site key" htmlFor={siteKey} error={form.errors[siteKey]}>
          <Input
            id={siteKey}
            className="font-mono"
            autoComplete="off"
            disabled={!editable}
            value={form.data[siteKey]}
            onChange={(event) => form.setData(siteKey, event.target.value)}
          />
        </FormField>
        <FormField
          label="Secret key"
          htmlFor={secretKey}
          error={form.errors[secretKey]}
          help={
            mask ? 'Saved. Leave blank to keep it, or type a new one to replace it.' : undefined
          }
        >
          <Input
            id={secretKey}
            type="password"
            className="font-mono"
            autoComplete="new-password"
            disabled={!editable}
            placeholder={mask ?? ''}
            value={form.data[secretKey]}
            onChange={(event) => form.setData(secretKey, event.target.value)}
          />
        </FormField>
      </div>
    )
  }

  return (
    <>
      <Head title="Forms settings" />
      <PageHeader
        title="Forms"
        description="Who form emails come from, who hears about new submissions, and how forms keep bots out."
        back={{ href: '/admin/settings', label: 'Settings' }}
      />
      <form onSubmit={submit} className="grid max-w-3xl gap-6">
        <Card className="gap-4 py-4">
          <CardHeader className="px-4">
            <CardTitle className="text-sm">Email</CardTitle>
            <CardDescription>
              Notifications and confirmations are sent from this address.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 px-4 sm:grid-cols-2">
            <FormField label="From name" htmlFor="fromName" error={form.errors.fromName}>
              <Input
                id="fromName"
                placeholder="Acme"
                disabled={!editable}
                value={form.data.fromName}
                onChange={(event) => form.setData('fromName', event.target.value)}
              />
            </FormField>
            <FormField
              label="From address"
              htmlFor="fromEmail"
              help="Use an address on your site’s domain so the mail isn’t marked as spam."
              error={form.errors.fromEmail}
            >
              <Input
                id="fromEmail"
                type="email"
                placeholder="hello@example.com"
                disabled={!editable}
                value={form.data.fromEmail}
                onChange={(event) => form.setData('fromEmail', event.target.value)}
              />
            </FormField>
            <FormField
              label="Default recipients"
              htmlFor="defaultRecipients"
              className="sm:col-span-2"
              help="Comma-separated. A form’s notification goes here when it doesn’t list its own recipients."
              error={form.errors.defaultRecipients}
            >
              <Input
                id="defaultRecipients"
                placeholder="team@example.com"
                disabled={!editable}
                value={form.data.defaultRecipients}
                onChange={(event) => form.setData('defaultRecipients', event.target.value)}
              />
            </FormField>
          </CardContent>
        </Card>

        <Card className="gap-4 py-4">
          <CardHeader className="px-4">
            <CardTitle className="flex items-center gap-2 text-sm">
              <ShieldCheck className="size-4" />
              Spam protection
            </CardTitle>
            <CardDescription>
              Every form has a hidden honeypot. Add a captcha for stronger protection.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 px-4">
            <RadioGroup
              value={form.data.captchaProvider}
              disabled={!editable}
              onValueChange={(value) => form.setData('captchaProvider', value as CaptchaProvider)}
              className="gap-3 sm:grid-cols-3"
            >
              {PROVIDERS.map((provider) => (
                <Label
                  key={provider.value}
                  htmlFor={`provider-${provider.value}`}
                  className="has-[[data-state=checked]]:border-primary flex cursor-pointer items-start gap-3 rounded-lg border p-3 font-normal"
                >
                  <RadioGroupItem
                    id={`provider-${provider.value}`}
                    value={provider.value}
                    className="mt-0.5"
                  />
                  <span className="grid gap-1">
                    <span className="font-medium">{provider.label}</span>
                    <span className="text-muted-foreground text-xs">{provider.description}</span>
                  </span>
                </Label>
              ))}
            </RadioGroup>
            {form.data.captchaProvider === 'turnstile' && keyFields('turnstile')}
            {form.data.captchaProvider === 'recaptcha' && keyFields('recaptcha')}
            <FormField
              label="Keep spam for (days)"
              htmlFor="spamRetentionDays"
              help="Spam older than this is deleted every night. 0 keeps it forever."
              error={form.errors.spamRetentionDays}
            >
              <Input
                id="spamRetentionDays"
                type="number"
                min={0}
                className="w-32"
                disabled={!editable}
                value={form.data.spamRetentionDays}
                onChange={(event) => form.setData('spamRetentionDays', Number(event.target.value))}
              />
            </FormField>
          </CardContent>
        </Card>

        {editable && (
          <div>
            <Button type="submit" disabled={form.processing}>
              {form.processing ? 'Saving…' : 'Save settings'}
            </Button>
          </div>
        )}
      </form>
    </>
  )
}
