import { useRef } from 'react'
import { Mail, MailCheck } from 'lucide-react'
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import FormField from '~/components/admin/form_field'
import { errorAt, type Errors } from '~/lib/errors'
import type { EmailKind, FormEmailData, FormField as FormFieldDef } from '../../app/types'

const NONE = '__none__'

const COPY: Record<
  EmailKind,
  { title: string; description: string; fieldLabel: string; fieldHelp: string; icon: typeof Mail }
> = {
  notification: {
    title: 'Notification to your team',
    description: 'Sent to the people who handle this form whenever a submission arrives.',
    fieldLabel: 'Reply-to',
    fieldHelp: 'Replying to the email goes to the address the visitor typed in this field.',
    icon: Mail,
  },
  confirmation: {
    title: 'Confirmation to the visitor',
    description: 'An automatic reply to the person who sent the form.',
    fieldLabel: 'Send to the address in',
    fieldHelp: 'Defaults to the first email field.',
    icon: MailCheck,
  },
}

function Placeholders({
  fields,
  onInsert,
}: {
  fields: FormFieldDef[]
  onInsert: (token: string) => void
}) {
  const tokens = [
    ...fields.filter((field) => field.name).map((field) => field.name),
    'answers',
    'form_title',
    'submission_id',
    'submitted_at',
    'page_url',
    'site_name',
  ]
  return (
    <div className="flex flex-wrap gap-1.5">
      {tokens.map((token) => (
        <button
          key={token}
          type="button"
          onClick={() => onInsert(`{{${token}}}`)}
          className="bg-muted hover:bg-muted/70 rounded px-1.5 py-0.5 font-mono text-xs"
        >
          {`{{${token}}}`}
        </button>
      ))}
    </div>
  )
}

function EmailCard({
  kind,
  value,
  fields,
  errors,
  defaultRecipients,
  onChange,
}: {
  kind: EmailKind
  value: FormEmailData
  fields: FormFieldDef[]
  errors: Errors
  defaultRecipients: string | null
  onChange: (value: FormEmailData) => void
}) {
  const copy = COPY[kind]
  const Icon = copy.icon
  const body = useRef<HTMLTextAreaElement>(null)
  const at = `emails.${kind}`
  const emailFields = fields.filter((field) => field.type === 'email' && field.name)
  const update = (changes: Partial<FormEmailData>) => onChange({ ...value, ...changes })

  function insert(token: string) {
    const element = body.current
    if (!element) return update({ body: `${value.body}${token}` })
    const start = element.selectionStart ?? value.body.length
    const end = element.selectionEnd ?? start
    update({ body: `${value.body.slice(0, start)}${token}${value.body.slice(end)}` })
    requestAnimationFrame(() => {
      element.focus()
      element.setSelectionRange(start + token.length, start + token.length)
    })
  }

  return (
    <Card className="gap-4 py-4">
      <CardHeader className="flex flex-row items-start justify-between gap-4 px-4">
        <div className="flex gap-3">
          <Icon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
          <div className="grid gap-1">
            <CardTitle className="text-sm">{copy.title}</CardTitle>
            <CardDescription>{copy.description}</CardDescription>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor={`${kind}-enabled`} className="text-muted-foreground text-xs">
            {value.enabled ? 'On' : 'Off'}
          </Label>
          <Switch
            id={`${kind}-enabled`}
            checked={value.enabled}
            onCheckedChange={(enabled) => update({ enabled })}
          />
        </div>
      </CardHeader>
      {value.enabled && (
        <CardContent className="grid gap-4 px-4 sm:grid-cols-2">
          {kind === 'notification' && (
            <FormField
              label="Recipients"
              htmlFor={`${kind}-recipients`}
              help={
                defaultRecipients
                  ? `Comma-separated. Leave empty to use the default: ${defaultRecipients}.`
                  : 'Comma-separated email addresses.'
              }
              error={errorAt(errors, `${at}.recipients`)}
            >
              <Input
                id={`${kind}-recipients`}
                placeholder={defaultRecipients || 'team@example.com, sales@example.com'}
                value={value.recipients}
                onChange={(event) => update({ recipients: event.target.value })}
              />
            </FormField>
          )}
          <FormField
            label={copy.fieldLabel}
            help={copy.fieldHelp}
            error={errorAt(errors, `${at}.fromField`)}
            className={kind === 'confirmation' ? 'sm:col-span-2' : undefined}
          >
            <Select
              value={value.fromField || NONE}
              onValueChange={(fromField) =>
                update({ fromField: fromField === NONE ? '' : fromField })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>
                  {kind === 'notification' ? 'No reply-to' : 'First email field'}
                </SelectItem>
                {emailFields.map((field) => (
                  <SelectItem key={field.name} value={field.name}>
                    {field.label || field.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField
            label="Subject"
            htmlFor={`${kind}-subject`}
            className="sm:col-span-2"
            error={errorAt(errors, `${at}.subject`)}
          >
            <Input
              id={`${kind}-subject`}
              value={value.subject}
              onChange={(event) => update({ subject: event.target.value })}
            />
          </FormField>
          <FormField
            label="Message"
            htmlFor={`${kind}-body`}
            className="sm:col-span-2"
            help="Markdown. Click a placeholder to insert it; {{answers}} lists every answer."
            error={errorAt(errors, `${at}.body`)}
          >
            <Textarea
              ref={body}
              id={`${kind}-body`}
              rows={8}
              className="font-mono text-sm"
              value={value.body}
              onChange={(event) => update({ body: event.target.value })}
            />
          </FormField>
          <div className="sm:col-span-2">
            <Placeholders fields={fields} onInsert={insert} />
          </div>
        </CardContent>
      )}
    </Card>
  )
}

export default function EmailSettings({
  emails,
  fields,
  errors,
  defaultRecipients,
  onChange,
}: {
  emails: Record<EmailKind, FormEmailData>
  fields: FormFieldDef[]
  errors: Errors
  defaultRecipients: string | null
  onChange: (emails: Record<EmailKind, FormEmailData>) => void
}) {
  return (
    <div className="grid gap-4">
      {(['notification', 'confirmation'] as const).map((kind) => (
        <EmailCard
          key={kind}
          kind={kind}
          value={emails[kind]}
          fields={fields}
          errors={errors}
          defaultRecipients={defaultRecipients}
          onChange={(value) => onChange({ ...emails, [kind]: value })}
        />
      ))}
    </div>
  )
}
