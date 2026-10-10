import { usePage } from '@inertiajs/react'
import {
  CODE_LANGUAGES,
  showIfMet,
  type RichTextDoc,
  type EntryOption,
  type Field,
  type FieldData,
  type LinkValue,
  type Block,
} from '#types/content'
import { Input } from '~/components/ui/input'
import { Textarea } from '~/components/ui/textarea'
import { Switch } from '~/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import FormField from '~/components/admin/form_field'
import AssetInput from '~/components/fields/asset_input'
import LinkInput from '~/components/fields/link_input'
import RichTextEditor from '~/components/fields/rich_text_editor'
import MarkdownInput from '~/components/fields/markdown_input'
import DateTimeInput from '~/components/fields/datetime_input'
import { RecordRefsInput, StringListInput } from '~/components/fields/list_inputs'
import { pluginFields } from '~/lib/plugin_components'
import ReferenceCombobox from '~/components/fields/reference_combobox'
import RepeaterInput from '~/components/fields/repeater_input'
import BlocksEditor from '~/components/fields/blocks_editor'
import { useFields } from '~/components/fields/context'
import { errorAt } from '~/lib/errors'
import { urlFor } from '~/client'

const BLANK = '__blank__'

function sortedOptions(options: string[] | undefined) {
  return [...(options ?? [])].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
  )
}

function UnknownField({ type }: { type: string }) {
  return (
    <p
      className="text-muted-foreground rounded-md border border-dashed px-3 py-2 text-sm"
      data-unknown-field
    >
      This field’s type (<code className="font-mono">{type}</code>) has no editor; its value is kept
      as it is.
    </p>
  )
}

export function FieldInput({
  field,
  value,
  onChange,
  path,
}: {
  field: Field
  value: unknown
  onChange: (value: unknown) => void
  path: string
}) {
  const id = path.replace(/\./g, '-')
  const enabledPluginTypes = usePage().props.admin?.fieldTypes ?? []

  switch (field.type) {
    case 'string':
      return (
        <Input id={id} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} />
      )
    case 'text':
      return (
        <Textarea
          id={id}
          rows={3}
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
        />
      )
    case 'richtext':
      return <RichTextEditor id={id} value={(value as RichTextDoc) ?? null} onChange={onChange} />
    case 'markdown':
      return <MarkdownInput id={id} value={String(value ?? '')} onChange={onChange} />
    case 'code': {
      const language = CODE_LANGUAGES.find((option) => option.value === field.language)
      return (
        <div className="grid gap-1">
          <Textarea
            id={id}
            rows={8}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            data-code-input
            className="bg-muted/30 font-mono text-xs leading-relaxed"
            value={String(value ?? '')}
            onChange={(e) => onChange(e.target.value)}
          />
          {language && language.value !== 'plain' && (
            <span className="text-muted-foreground text-xs">{language.label}</span>
          )}
        </div>
      )
    }
    case 'integer':
      return (
        <Input
          id={id}
          type={
            value === null || value === undefined || Number.isInteger(value) ? 'number' : 'text'
          }
          step={1}
          value={value === null || value === undefined ? '' : String(value)}
          onChange={(e) => {
            const raw = e.target.value
            if (raw === '') return onChange(null)
            onChange(/^-?\d+$/.test(raw.trim()) ? Number.parseInt(raw, 10) : raw)
          }}
        />
      )
    case 'boolean':
      return (
        <Switch id={id} checked={Boolean(value)} onCheckedChange={(checked) => onChange(checked)} />
      )
    case 'select': {
      const options = sortedOptions(field.options)
      const current = value === null || value === undefined || value === '' ? BLANK : String(value)
      return (
        <Select value={current} onValueChange={(next) => onChange(next === BLANK ? null : next)}>
          <SelectTrigger id={id} className="w-full max-w-md">
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={BLANK}>—</SelectItem>
            {current !== BLANK && !options.includes(current) && (
              <SelectItem value={current}>{current}</SelectItem>
            )}
            {options.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    }
    case 'url':
      return (
        <Input
          id={id}
          inputMode="url"
          className="font-mono"
          value={String(value ?? '')}
          placeholder="https://… or /path"
          onChange={(e) => onChange(e.target.value)}
        />
      )
    case 'email':
      return (
        <Input
          id={id}
          type="email"
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
        />
      )
    case 'datetime':
      return <DateTimeInput id={id} value={value} onChange={onChange} />
    case 'link':
      return <LinkInput value={(value as LinkValue) ?? null} onChange={onChange} />
    case 'asset':
      return <AssetInput value={(value as number) ?? null} onChange={onChange} />
    case 'entry':
      return (
        <ReferenceCombobox<EntryOption>
          url={urlFor('admin.lookups.entries')}
          params={{ collection: field.collection }}
          value={(value as number) ?? null}
          onChange={onChange}
          label={(entry) => entry.title}
          detail={(entry) => entry.collectionName}
          placeholder={
            field.collection ? 'Choose an entry…' : 'Choose an entry from any collection…'
          }
        />
      )
    case 'record_refs':
      return (
        <RecordRefsInput
          field={field}
          value={Array.isArray(value) ? (value as number[]) : []}
          onChange={onChange}
        />
      )
    case 'string_list':
      return (
        <StringListInput
          id={id}
          value={Array.isArray(value) ? (value as unknown[]).map((item) => String(item ?? '')) : []}
          onChange={onChange}
        />
      )
    case 'group':
      return (
        <div className="rounded-lg border p-4">
          <FieldsForm
            fields={field.of ?? []}
            value={(value as FieldData) ?? {}}
            onChange={onChange}
            path={path}
          />
        </div>
      )
    case 'repeater':
      return (
        <RepeaterInput
          field={field}
          value={Array.isArray(value) ? (value as FieldData[]) : []}
          onChange={onChange}
          path={path}
        />
      )
    case 'blocks':
      return (
        <BlocksEditor
          value={Array.isArray(value) ? (value as Block[]) : []}
          onChange={onChange}
          path={path}
          allowedTypes={field.allowedTypes}
        />
      )
    default: {
      const PluginInput = pluginFields[field.type]
      const enabled = enabledPluginTypes.some((option) => option.type === field.type)
      if (PluginInput && enabled)
        return <PluginInput field={field} value={value} onChange={onChange} path={path} />
      return <UnknownField type={field.type} />
    }
  }
}

export default function FieldsForm({
  fields,
  value,
  onChange,
  path,
}: {
  fields: Field[]
  value: FieldData
  onChange: (value: FieldData) => void
  path: string
}) {
  const { errors } = useFields()
  const visible = fields.filter((field) => showIfMet(field.showIf, value ?? {}))

  return (
    <div className="grid gap-5">
      {visible.map((field) => {
        const at = `${path}.${field.name}`
        return (
          <div key={field.name} data-field-name={field.name} className="min-w-0">
            <FormField
              label={field.label || field.name}
              htmlFor={at.replace(/\./g, '-')}
              required={field.required}
              help={field.help}
              error={errorAt(errors, at)}
            >
              <FieldInput
                field={field}
                value={value?.[field.name]}
                path={at}
                onChange={(next) => onChange({ ...value, [field.name]: next })}
              />
            </FormField>
          </div>
        )
      })}
    </div>
  )
}
