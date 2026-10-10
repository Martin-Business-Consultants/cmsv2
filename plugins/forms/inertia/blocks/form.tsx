import { useState, type FormEvent } from 'react'
import { useForm, usePage } from '@inertiajs/react'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import type { RenderBlock } from '#types/site'
import type { FormField, ResolvedForm } from '../../app/types'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Textarea } from '~/components/ui/textarea'
import { Checkbox } from '~/components/ui/checkbox'
import { cn } from '~/lib/utils'
import { ContactDetails } from '~/site/blocks/contact_info'
import { Container, Section } from '~/site/section'
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio_group'
import Captcha from '../components/captcha'
import type { SiteShared } from '~/site/types'

type FormSuccess = { form?: string; message?: string }
type Value = string | boolean | File | null

const fieldClass = 'h-11 bg-background md:text-base'

function initialData(form: ResolvedForm) {
  const data: Record<string, Value> = { [form.honeypot]: '' }
  if (form.captcha) data[form.captcha.field] = ''
  for (const field of form.fields) {
    data[field.name] = field.type === 'checkbox' ? false : field.type === 'file' ? null : ''
  }
  return data
}

function FieldInput({
  field,
  id,
  value,
  error,
  onChange,
}: {
  field: FormField
  id: string
  value: Value
  error?: string
  onChange: (value: Value) => void
}) {
  const common = {
    'id': id,
    'name': field.name,
    'required': field.required,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? `${id}-error` : field.help ? `${id}-help` : undefined,
  }
  switch (field.type) {
    case 'textarea':
      return (
        <Textarea
          {...common}
          rows={5}
          placeholder={field.placeholder}
          value={String(value ?? '')}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-32 bg-background md:text-base"
        />
      )
    case 'select':
      return (
        <select
          {...common}
          value={String(value ?? '')}
          onChange={(event) => onChange(event.target.value)}
          className={cn(
            'w-full rounded-md border border-input px-3 shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive',
            fieldClass
          )}
        >
          <option value="">{field.placeholder || 'Select…'}</option>
          {(field.options ?? []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      )
    case 'radio':
      return (
        <RadioGroup
          value={String(value ?? '')}
          onValueChange={onChange}
          aria-invalid={error ? true : undefined}
          aria-describedby={common['aria-describedby']}
          className="gap-2.5 pt-1"
        >
          {(field.options ?? []).map((option, index) => (
            <div key={option} className="flex items-center gap-2.5">
              <RadioGroupItem value={option} id={`${id}-${index}`} />
              <Label htmlFor={`${id}-${index}`} className="font-normal">
                {option}
              </Label>
            </div>
          ))}
        </RadioGroup>
      )
    case 'file':
      return (
        <Input
          {...common}
          type="file"
          accept={
            field.accept
              ? field.accept
                  .split(',')
                  .map((item) => `.${item.trim().replace(/^\./, '')}`)
                  .join(',')
              : undefined
          }
          onChange={(event) => onChange(event.target.files?.[0] ?? null)}
          className="h-11 bg-background pt-2.5 md:text-base"
        />
      )
    case 'checkbox':
      return null
    default:
      return (
        <Input
          {...common}
          type={field.type}
          placeholder={field.placeholder}
          value={String(value ?? '')}
          onChange={(event) => onChange(event.target.value)}
          className={fieldClass}
          autoComplete={
            field.type === 'email'
              ? 'email'
              : field.type === 'tel'
                ? 'tel'
                : field.name === 'name'
                  ? 'name'
                  : undefined
          }
        />
      )
  }
}

export function SiteForm({ form: definition }: { form: ResolvedForm }) {
  const { preview } = usePage<SiteShared>().props
  const flash = usePage().flash as Record<string, unknown>
  const form = useForm<Record<string, Value>>(initialData(definition))
  const [submitted, setSubmitted] = useState(false)
  const [resetKey, setResetKey] = useState(0)

  const formSuccess = flash?.formSuccess as FormSuccess | undefined
  const succeeded =
    (formSuccess && (!formSuccess.form || formSuccess.form === definition.slug)) ||
    (submitted && typeof flash?.success === 'string')
  const successMessage =
    formSuccess?.message ||
    (typeof flash?.success === 'string' ? flash.success : null) ||
    definition.successMessage ||
    'Thanks! Your message has been sent.'
  const flashError = submitted && typeof flash?.error === 'string' ? flash.error : null

  function submit(event: FormEvent) {
    event.preventDefault()
    if (preview) return
    form.transform((data) => ({ ...data, page_url: window.location.href }))
    form.post(definition.action, {
      preserveScroll: true,
      onSuccess: () => setSubmitted(true),
      onError: () => setSubmitted(false),
      onFinish: () => {
        if (definition.captcha) setResetKey((key) => key + 1)
      },
    })
  }

  if (succeeded) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-border bg-card px-6 py-14 text-center shadow-sm">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <CheckCircle2 className="size-6" />
        </div>
        <p className="mt-5 text-lg font-medium text-balance">{successMessage}</p>
      </div>
    )
  }

  const errors = form.errors as Record<string, string | undefined>

  return (
    <form
      onSubmit={submit}
      noValidate
      className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8"
    >
      {flashError && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {flashError}
        </div>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        {definition.fields.map((field) => {
          const id = `${definition.slug}-${field.name}`
          const error = errors[field.name]
          const wide = ['textarea', 'checkbox', 'radio', 'file'].includes(field.type)
          if (field.type === 'checkbox') {
            return (
              <div key={field.name} className="sm:col-span-2">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id={id}
                    checked={!!form.data[field.name]}
                    onCheckedChange={(checked) => form.setData(field.name, checked === true)}
                    aria-invalid={error ? true : undefined}
                    className="mt-0.5"
                  />
                  <Label htmlFor={id} className="leading-snug font-normal">
                    {field.label}
                    {field.required && <span className="text-destructive">*</span>}
                  </Label>
                </div>
                {field.help && (
                  <p className="mt-1.5 pl-7 text-sm text-muted-foreground">{field.help}</p>
                )}
                {error && <p className="mt-1.5 pl-7 text-sm text-destructive">{error}</p>}
              </div>
            )
          }
          return (
            <div key={field.name} className={cn('space-y-2', wide && 'sm:col-span-2')}>
              <Label htmlFor={id} className="gap-1">
                {field.label}
                {field.required && (
                  <span className="text-destructive" aria-hidden>
                    *
                  </span>
                )}
              </Label>
              <FieldInput
                field={field}
                id={id}
                value={form.data[field.name]}
                error={error}
                onChange={(value) => form.setData(field.name, value)}
              />
              {field.help && !error && (
                <p id={`${id}-help`} className="text-sm text-muted-foreground">
                  {field.help}
                </p>
              )}
              {error && (
                <p id={`${id}-error`} className="text-sm text-destructive">
                  {error}
                </p>
              )}
            </div>
          )
        })}
      </div>
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor={`${definition.slug}-${definition.honeypot}`}>Leave this empty</label>
        <input
          id={`${definition.slug}-${definition.honeypot}`}
          type="text"
          name={definition.honeypot}
          tabIndex={-1}
          autoComplete="off"
          value={String(form.data[definition.honeypot] ?? '')}
          onChange={(event) => form.setData(definition.honeypot, event.target.value)}
        />
      </div>
      {definition.captcha && !preview && (
        <div>
          <Captcha
            captcha={definition.captcha}
            resetKey={resetKey}
            onToken={(token) => form.setData(definition.captcha!.field, token)}
          />
        </div>
      )}
      {definition.captcha && errors[definition.captcha.field] && (
        <p className="text-sm text-destructive">{errors[definition.captcha.field]}</p>
      )}
      <button
        type="submit"
        disabled={form.processing || !!preview}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-8 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-60 sm:w-auto"
      >
        {form.processing && <Loader2 className="size-4 animate-spin" />}
        {definition.submitLabel || 'Submit'}
      </button>
      {preview && (
        <p className="text-sm text-muted-foreground">Submissions are disabled in preview.</p>
      )}
    </form>
  )
}

export default function FormBlock({ data }: { block: RenderBlock; data: Record<string, any> }) {
  const { site } = usePage<SiteShared>().props
  const form =
    data.form && typeof data.form === 'object' && Array.isArray(data.form.fields)
      ? (data.form as ResolvedForm)
      : null
  const contact = site?.globals?.contact ?? {}
  const hasIntro = data.heading || data.body
  const hasContact = Object.values(contact).some(Boolean)

  if (!form) return null

  return (
    <Section>
      <Container
        className={cn(
          'grid gap-12 lg:gap-16',
          (hasIntro || hasContact) && 'lg:grid-cols-[2fr_3fr]'
        )}
      >
        {(hasIntro || hasContact) && (
          <div>
            {data.heading && (
              <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
                {data.heading}
              </h2>
            )}
            {data.body && (
              <p className="mt-4 text-lg leading-relaxed whitespace-pre-line text-muted-foreground">
                {data.body}
              </p>
            )}
            {hasContact && (
              <div className="mt-10">
                <ContactDetails contact={contact} compact />
              </div>
            )}
          </div>
        )}
        <div className="relative">
          <SiteForm form={form} />
        </div>
      </Container>
    </Section>
  )
}
