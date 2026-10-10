import { useState } from 'react'
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react'
import {
  FORM_FIELD_TYPES,
  type FormField as FormFieldDef,
  type FormFieldType,
} from '../../app/types'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Textarea } from '~/components/ui/textarea'
import { Switch } from '~/components/ui/switch'
import { Checkbox } from '~/components/ui/checkbox'
import { Label } from '~/components/ui/label'
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio_group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import FormField from '~/components/admin/form_field'
import { errorAt, errorsUnder, type Errors } from '~/lib/errors'
import { newId, snakeify } from '~/lib/format'
import { cn } from '~/lib/utils'

export const FORM_FIELD_LABELS: Record<FormFieldType, string> = {
  text: 'Short text',
  email: 'Email',
  tel: 'Phone',
  textarea: 'Long text',
  select: 'Dropdown',
  radio: 'Multiple choice',
  checkbox: 'Checkbox',
  number: 'Number',
  date: 'Date',
  file: 'File upload',
}

const hasOptions = (type: FormFieldType) => type === 'select' || type === 'radio'
const hasPlaceholder = (type: FormFieldType) => !['checkbox', 'radio', 'file'].includes(type)

function FieldRow({
  field,
  path,
  errors,
  first,
  last,
  onChange,
  onMove,
  onRemove,
}: {
  field: FormFieldDef
  path: string
  errors: Errors
  first: boolean
  last: boolean
  onChange: (field: FormFieldDef) => void
  onMove: (offset: number) => void
  onRemove: () => void
}) {
  const hasErrors = errorsUnder(errors, path).length > 0
  const [open, setOpen] = useState(!field.label || hasErrors)
  const [nameTouched, setNameTouched] = useState(Boolean(field.name))
  const update = (changes: Partial<FormFieldDef>) => onChange({ ...field, ...changes })
  const id = path.replace(/\./g, '-')

  return (
    <div className={cn('bg-card rounded-lg border', hasErrors && 'border-destructive')}>
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          onClick={() => setOpen(!open || hasErrors)}
        >
          {open ? (
            <ChevronDown className="size-4 shrink-0" />
          ) : (
            <ChevronRight className="size-4 shrink-0" />
          )}
          <span className="min-w-0 truncate text-sm font-medium">{field.label || 'New field'}</span>
          <span className="text-muted-foreground hidden truncate font-mono text-xs sm:inline">
            {field.name}
          </span>
          <span className="bg-muted shrink-0 rounded px-1.5 py-0.5 text-xs">
            {FORM_FIELD_LABELS[field.type]}
          </span>
          {field.required && <span className="text-destructive shrink-0 text-xs">required</span>}
        </button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7"
          disabled={first}
          aria-label="Move up"
          onClick={() => onMove(-1)}
        >
          <ArrowUp />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7"
          disabled={last}
          aria-label="Move down"
          onClick={() => onMove(1)}
        >
          <ArrowDown />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7"
          aria-label="Remove field"
          onClick={onRemove}
        >
          <Trash2 />
        </Button>
      </div>
      {open && (
        <div className="grid gap-4 border-t p-4 sm:grid-cols-2">
          <FormField label="Label" htmlFor={`${id}-label`} error={errorAt(errors, `${path}.label`)}>
            <Input
              id={`${id}-label`}
              value={field.label}
              onChange={(event) =>
                update({
                  label: event.target.value,
                  ...(nameTouched ? {} : { name: snakeify(event.target.value) }),
                })
              }
            />
          </FormField>
          <FormField
            label="Name"
            htmlFor={`${id}-name`}
            help="Key stored with each submission."
            error={errorAt(errors, `${path}.name`)}
          >
            <Input
              id={`${id}-name`}
              className="font-mono"
              value={field.name}
              onChange={(event) => {
                setNameTouched(true)
                update({ name: event.target.value })
              }}
            />
          </FormField>
          <FormField label="Type" error={errorAt(errors, `${path}.type`)}>
            <Select
              value={field.type}
              onValueChange={(type) => update({ type: type as FormFieldType })}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FORM_FIELD_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {FORM_FIELD_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <div className="flex items-end gap-2 pb-2">
            <Switch
              id={`${id}-required`}
              checked={Boolean(field.required)}
              onCheckedChange={(required) => update({ required })}
            />
            <Label htmlFor={`${id}-required`}>Required</Label>
          </div>
          {hasPlaceholder(field.type) && (
            <FormField
              label="Placeholder"
              htmlFor={`${id}-placeholder`}
              error={errorAt(errors, `${path}.placeholder`)}
            >
              <Input
                id={`${id}-placeholder`}
                value={field.placeholder ?? ''}
                onChange={(event) => update({ placeholder: event.target.value })}
              />
            </FormField>
          )}
          <FormField
            label="Help text"
            htmlFor={`${id}-help`}
            className={hasPlaceholder(field.type) ? undefined : 'sm:col-span-2'}
            error={errorAt(errors, `${path}.help`)}
          >
            <Input
              id={`${id}-help`}
              value={field.help ?? ''}
              onChange={(event) => update({ help: event.target.value })}
            />
          </FormField>
          {field.type === 'file' && (
            <FormField
              label="Allowed file types"
              htmlFor={`${id}-accept`}
              help="Extensions separated by commas, e.g. pdf, jpg, png. Leave empty to allow any file up to 10 MB."
              className="sm:col-span-2"
              error={errorAt(errors, `${path}.accept`)}
            >
              <Input
                id={`${id}-accept`}
                placeholder="pdf, docx, jpg"
                value={field.accept ?? ''}
                onChange={(event) => update({ accept: event.target.value })}
              />
            </FormField>
          )}
          {hasOptions(field.type) && (
            <FormField
              label="Options"
              htmlFor={`${id}-options`}
              help="One per line."
              className="sm:col-span-2"
              error={errorAt(errors, `${path}.options`)}
            >
              <Textarea
                id={`${id}-options`}
                rows={4}
                value={(field.options ?? []).join('\n')}
                onChange={(event) => update({ options: event.target.value.split('\n') })}
                onBlur={() =>
                  update({
                    options: (field.options ?? []).map((option) => option.trim()).filter(Boolean),
                  })
                }
              />
            </FormField>
          )}
        </div>
      )}
    </div>
  )
}

export function FormBuilder({
  value,
  onChange,
  errors,
}: {
  value: FormFieldDef[]
  onChange: (fields: FormFieldDef[]) => void
  errors: Errors
}) {
  const [keys, setKeys] = useState(() => value.map(() => newId()))
  const rowKeys = value.map((_, index) => keys[index] ?? `extra-${index}`)

  function add() {
    onChange([...value, { name: '', label: '', type: 'text' }])
    setKeys([...rowKeys, newId()])
  }

  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index))
    setKeys(rowKeys.filter((_, i) => i !== index))
  }

  function move(index: number, offset: number) {
    const target = index + offset
    if (target < 0 || target >= value.length) return
    const fields = [...value]
    const nextKeys = [...rowKeys]
    ;[fields[index], fields[target]] = [fields[target], fields[index]]
    ;[nextKeys[index], nextKeys[target]] = [nextKeys[target], nextKeys[index]]
    onChange(fields)
    setKeys(nextKeys)
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-2">
      {value.length === 0 && (
        <div className="text-muted-foreground rounded-lg border border-dashed px-4 py-8 text-center text-sm">
          No fields yet. Add the first one to start building the form.
        </div>
      )}
      {value.map((field, index) => (
        <FieldRow
          key={rowKeys[index]}
          field={field}
          path={`fields.${index}`}
          errors={errors}
          first={index === 0}
          last={index === value.length - 1}
          onChange={(next) => onChange(value.map((item, i) => (i === index ? next : item)))}
          onMove={(offset) => move(index, offset)}
          onRemove={() => remove(index)}
        />
      ))}
      <Button type="button" variant="outline" className="w-fit" onClick={add}>
        <Plus />
        Add field
      </Button>
    </div>
  )
}

export function FormPreview({
  title,
  fields,
  submitLabel,
}: {
  title: string
  fields: FormFieldDef[]
  submitLabel: string
}) {
  if (fields.length === 0) {
    return <p className="text-muted-foreground text-sm">Fields you add appear here.</p>
  }

  return (
    <div className="grid gap-4" role="group" aria-label={title}>
      {fields.map((field, index) => {
        const id = `preview-${index}`
        const label = field.label || 'Untitled field'
        if (field.type === 'checkbox') {
          return (
            <div key={id} className="grid gap-1">
              <div className="flex items-center gap-2">
                <Checkbox id={id} />
                <Label htmlFor={id} className="font-normal">
                  {label}
                  {field.required && <span className="text-destructive">*</span>}
                </Label>
              </div>
              {field.help && <p className="text-muted-foreground pl-6 text-xs">{field.help}</p>}
            </div>
          )
        }
        return (
          <FormField
            key={id}
            label={label}
            htmlFor={id}
            required={field.required}
            help={field.help}
          >
            {field.type === 'textarea' ? (
              <Textarea id={id} rows={4} placeholder={field.placeholder} />
            ) : field.type === 'radio' ? (
              <RadioGroup className="gap-2">
                {(field.options ?? []).filter(Boolean).map((option, optionIndex) => (
                  <div key={`${optionIndex}-${option}`} className="flex items-center gap-2">
                    <RadioGroupItem value={option} id={`${id}-${optionIndex}`} />
                    <Label htmlFor={`${id}-${optionIndex}`} className="font-normal">
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            ) : field.type === 'select' ? (
              <Select>
                <SelectTrigger id={id} className="w-full">
                  <SelectValue placeholder={field.placeholder || 'Choose…'} />
                </SelectTrigger>
                <SelectContent>
                  {(field.options ?? []).filter(Boolean).map((option, optionIndex) => (
                    <SelectItem key={`${optionIndex}-${option}`} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input id={id} type={field.type} placeholder={field.placeholder} />
            )}
          </FormField>
        )
      })}
      <Button type="button" className="w-fit">
        {submitLabel || 'Send'}
      </Button>
    </div>
  )
}
