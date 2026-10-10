import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { useForm, usePage } from '@inertiajs/react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Textarea } from '~/components/ui/textarea'
import { Switch } from '~/components/ui/switch'
import { Label } from '~/components/ui/label'
import { Badge } from '~/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import FormField from '~/components/admin/form_field'
import { errorAt, errorsUnder, type Errors } from '~/lib/errors'
import { slugify } from '~/lib/format'
import type { FormDetail } from '../../app/types'
import { FormBuilder, FormPreview } from './form_builder'
import EmailSettings from './email_settings'

export type FormFormData = Omit<FormDetail, 'id' | 'createdAt' | 'updatedAt'>

const TABS = ['fields', 'settings', 'emails', 'submissions'] as const
type Tab = (typeof TABS)[number]

function tabFromHash(): Tab {
  if (typeof window === 'undefined') return 'fields'
  const hash = window.location.hash.slice(1)
  return (TABS as readonly string[]).includes(hash) ? (hash as Tab) : 'fields'
}

function TabLabel({ label, invalid, count }: { label: string; invalid?: boolean; count?: number }) {
  return (
    <span className="flex items-center gap-1.5">
      {label}
      {invalid && <span className="bg-destructive size-1.5 rounded-full" />}
      {count !== undefined && count > 0 && (
        <Badge variant="secondary" className="h-4 px-1 text-[10px] tabular-nums">
          {count}
        </Badge>
      )}
    </span>
  )
}

export default function FormEditor({
  initial,
  action,
  method,
  submitLabel,
  defaultRecipients,
  footer,
  submissions,
  unread,
}: {
  initial: FormFormData
  action: string
  method: 'post' | 'put'
  submitLabel: string
  defaultRecipients: string | null
  footer?: ReactNode
  submissions?: ReactNode
  unread?: number
}) {
  const form = useForm<FormFormData>(initial)
  const { errors: shared } = usePage().props
  const errors = { ...(shared as Errors), ...(form.errors as Errors) }
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.slug))
  const [tab, setTab] = useState<Tab>('fields')

  useEffect(() => setTab(tabFromHash()), [])

  function changeTab(value: string) {
    setTab(value as Tab)
    window.history.replaceState(window.history.state, '', `#${value}`)
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    form.transform((data) => ({
      ...data,
      fields: data.fields.map((field) => ({
        ...field,
        options:
          field.type === 'select' || field.type === 'radio'
            ? (field.options ?? []).map((option) => option.trim()).filter(Boolean)
            : undefined,
      })),
    }))
    form.submit(method, action, {
      preserveScroll: true,
      onError: (failed) => {
        const keys = Object.keys(failed)
        if (keys.some((key) => key.startsWith('fields'))) changeTab('fields')
        else if (keys.some((key) => key.startsWith('emails'))) changeTab('emails')
        else if (
          keys.some((key) =>
            ['submitLabel', 'successMessage', 'submitUrl', 'webhookUrl'].includes(key)
          )
        )
          changeTab('settings')
      },
    })
  }

  const fieldsError = errorAt(errors, 'fields')
  const settingsInvalid = ['submitLabel', 'successMessage', 'submitUrl', 'webhookUrl'].some((key) =>
    errorAt(errors, key)
  )

  return (
    <form
      onSubmit={submit}
      className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]"
    >
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-6">
        <FormField label="Title" htmlFor="title" error={errorAt(errors, 'title')}>
          <Input
            id="title"
            className="h-11 text-lg"
            placeholder="Contact us"
            value={form.data.title}
            onChange={(event) => {
              const title = event.target.value
              form.setData((data) => ({
                ...data,
                title,
                slug: slugTouched ? data.slug : slugify(title),
              }))
            }}
          />
        </FormField>
        <Tabs value={tab} onValueChange={changeTab} className="min-w-0 gap-4">
          <TabsList className="w-full justify-start overflow-x-auto sm:w-fit">
            <TabsTrigger value="fields">
              <TabLabel
                label="Fields"
                invalid={errorsUnder(errors, 'fields').length > 0}
                count={form.data.fields.length}
              />
            </TabsTrigger>
            <TabsTrigger value="settings">
              <TabLabel label="Settings" invalid={settingsInvalid} />
            </TabsTrigger>
            <TabsTrigger value="emails">
              <TabLabel label="Emails" invalid={errorsUnder(errors, 'emails').length > 0} />
            </TabsTrigger>
            {submissions && (
              <TabsTrigger value="submissions">
                <TabLabel label="Submissions" count={unread} />
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="fields" className="grid grid-cols-[minmax(0,1fr)] gap-2">
            <p className="text-muted-foreground text-sm">
              Add, reorder and configure the questions visitors answer.
            </p>
            {fieldsError && <p className="text-destructive text-xs">{fieldsError}</p>}
            <FormBuilder
              value={form.data.fields}
              errors={errors}
              onChange={(fields) => form.setData('fields', fields)}
            />
          </TabsContent>

          <TabsContent value="settings" className="grid min-w-0 gap-4">
            <Card className="gap-4 py-4">
              <CardHeader className="px-4">
                <CardTitle className="text-sm">After submission</CardTitle>
                <CardDescription>What visitors see once they send the form.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 px-4 sm:grid-cols-2">
                <FormField
                  label="Submit button label"
                  htmlFor="submitLabel"
                  error={errorAt(errors, 'submitLabel')}
                >
                  <Input
                    id="submitLabel"
                    placeholder="Submit"
                    value={form.data.submitLabel}
                    onChange={(event) => form.setData('submitLabel', event.target.value)}
                  />
                </FormField>
                <FormField
                  label="Redirect to"
                  htmlFor="submitUrl"
                  help="Optional. A path like /thanks or a full URL; otherwise the success message shows in place."
                  error={errorAt(errors, 'submitUrl')}
                >
                  <Input
                    id="submitUrl"
                    placeholder="/thank-you"
                    value={form.data.submitUrl}
                    onChange={(event) => form.setData('submitUrl', event.target.value)}
                  />
                </FormField>
                <FormField
                  label="Success message"
                  htmlFor="successMessage"
                  className="sm:col-span-2"
                  error={errorAt(errors, 'successMessage')}
                >
                  <Textarea
                    id="successMessage"
                    rows={3}
                    placeholder="Thanks, your message has been sent."
                    value={form.data.successMessage}
                    onChange={(event) => form.setData('successMessage', event.target.value)}
                  />
                </FormField>
              </CardContent>
            </Card>
            <Card className="gap-4 py-4">
              <CardHeader className="px-4">
                <CardTitle className="text-sm">Webhook</CardTitle>
                <CardDescription>
                  POST each new submission as JSON to another service (a CRM, Zapier, Slack…).
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 px-4">
                <FormField
                  label="Webhook URL"
                  htmlFor="webhookUrl"
                  help={
                    'Receives {"event":"submission.created","form":{…},"submission":{…}}. Leave empty to turn it off.'
                  }
                  error={errorAt(errors, 'webhookUrl')}
                >
                  <Input
                    id="webhookUrl"
                    type="url"
                    placeholder="https://hooks.example.com/forms"
                    value={form.data.webhookUrl}
                    onChange={(event) => form.setData('webhookUrl', event.target.value)}
                  />
                </FormField>
              </CardContent>
            </Card>
            <Card className="gap-3 py-4">
              <CardHeader className="px-4">
                <CardTitle className="text-sm">Using this form</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground grid gap-2 px-4 text-sm">
                <p>
                  Add a <span className="text-foreground font-medium">Form</span> block to any page
                  and pick this form.
                </p>
                <p>
                  Headless frontends read it from{' '}
                  <code className="text-foreground font-mono text-xs">
                    GET /api/v1/forms/{form.data.slug || '…'}
                  </code>{' '}
                  and post answers to{' '}
                  <code className="text-foreground font-mono text-xs">
                    POST /forms/{form.data.slug || '…'}
                  </code>
                  .
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="emails" className="min-w-0">
            <EmailSettings
              emails={form.data.emails}
              fields={form.data.fields}
              errors={errors}
              defaultRecipients={defaultRecipients}
              onChange={(emails) => form.setData('emails', emails)}
            />
          </TabsContent>

          {submissions && (
            <TabsContent value="submissions" className="min-w-0">
              {submissions}
            </TabsContent>
          )}
        </Tabs>
      </div>

      <div className="grid content-start gap-4 lg:sticky lg:top-4 lg:self-start">
        <Card className="gap-4 py-4">
          <CardContent className="grid gap-4 px-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label htmlFor="status">Published</Label>
                <p className="text-muted-foreground text-xs">
                  {form.data.status === 'published'
                    ? 'Accepting submissions.'
                    : 'Draft forms reject submissions.'}
                </p>
              </div>
              <Switch
                id="status"
                checked={form.data.status === 'published'}
                onCheckedChange={(checked) =>
                  form.setData('status', checked ? 'published' : 'draft')
                }
              />
            </div>
            <FormField
              label="Slug"
              htmlFor="slug"
              error={errorAt(errors, 'slug')}
              help={`Posts to /forms/${form.data.slug || '…'}`}
            >
              <Input
                id="slug"
                className="font-mono"
                value={form.data.slug}
                onChange={(event) => {
                  setSlugTouched(true)
                  form.setData('slug', event.target.value)
                }}
              />
            </FormField>
            <Button type="submit" disabled={form.processing}>
              {form.processing ? 'Saving…' : submitLabel}
            </Button>
            {form.isDirty && (
              <p className="text-muted-foreground text-xs">You have unsaved changes.</p>
            )}
            {footer}
          </CardContent>
        </Card>
        {tab === 'fields' && (
          <Card className="gap-4 py-4">
            <CardHeader className="px-4">
              <CardTitle className="text-sm">Preview</CardTitle>
              <CardDescription>{form.data.title || 'Untitled form'}</CardDescription>
            </CardHeader>
            <CardContent className="px-4">
              <FormPreview
                title={form.data.title}
                fields={form.data.fields}
                submitLabel={form.data.submitLabel}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </form>
  )
}
