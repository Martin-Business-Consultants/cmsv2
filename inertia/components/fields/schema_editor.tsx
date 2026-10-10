import { usePage } from '@inertiajs/react'
import { useState } from 'react'
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, Plus, Trash2, X } from 'lucide-react'
import {
  CODE_LANGUAGES,
  FIELD_TYPES,
  SHOW_IF_COMPARATORS,
  TYPE_SETTINGS,
  type Field,
  type FieldType,
  type ShowIf,
  type ShowIfValue,
} from '#types/content'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Textarea } from '~/components/ui/textarea'
import { Switch } from '~/components/ui/switch'
import { Checkbox } from '~/components/ui/checkbox'
import { Label } from '~/components/ui/label'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '~/components/ui/collapsible'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import FormField from '~/components/admin/form_field'
import { useFields } from '~/components/fields/context'
import { errorAt, errorsUnder } from '~/lib/errors'
import { snakeify } from '~/lib/format'
import { cn } from '~/lib/utils'

export const TYPE_LABELS: Record<FieldType, string> = {
  string: 'Short text',
  text: 'Long text',
  markdown: 'Markdown',
  code: 'Code',
  richtext: 'Rich text',
  integer: 'Number',
  boolean: 'On / off',
  select: 'Dropdown',
  url: 'URL',
  email: 'Email',
  datetime: 'Date and time',
  link: 'Link',
  asset: 'Image or file',
  entry: 'Reference',
  record_refs: 'References',
  string_list: 'List of text',
  repeater: 'Repeater',
  group: 'Group',
  blocks: 'Blocks',
}

const ANY = '__any__'

type Placement = 'full' | 'tabs' | 'none'

const COMPARATOR_LABELS: Record<(typeof SHOW_IF_COMPARATORS)[number], string> = {
  equals: 'equals',
  not_equals: 'does not equal',
  in: 'is one of',
  not_in: 'is not one of',
}

const SETTING_KEYS = [...new Set(Object.values(TYPE_SETTINGS).flat())]

export function switchFieldType(field: Field, type: string): Field {
  const keep = new Set(TYPE_SETTINGS[type] ?? [])
  const next: Field = { ...field, type }
  for (const key of SETTING_KEYS) if (!keep.has(key)) delete (next as Record<string, unknown>)[key]
  return next
}

function comparatorOf(rule: ShowIf | undefined) {
  return SHOW_IF_COMPARATORS.find((key) => rule && key in rule) ?? 'equals'
}

function parseValue(text: string, sibling: Field | undefined): ShowIfValue {
  if (sibling?.type === 'boolean') return text === 'true'
  if (sibling?.type === 'integer' && /^-?\d+$/.test(text.trim())) return Number(text)
  return text
}

function ShowIfEditor({
  rule,
  siblings,
  onChange,
  error,
}: {
  rule: ShowIf | undefined
  siblings: Field[]
  onChange: (rule: ShowIf | undefined) => void
  error?: string
}) {
  const comparator = comparatorOf(rule)
  const sibling = siblings.find((field) => field.name === rule?.field)
  const raw = rule ? rule[comparator] : undefined
  const text = Array.isArray(raw) ? raw.join(', ') : raw === undefined ? '' : String(raw)
  const multiple = comparator === 'in' || comparator === 'not_in'

  function build(field: string, nextComparator: typeof comparator, valueText: string): ShowIf {
    const values = valueText
      .split(',')
      .map((part) => part.trim())
      .filter((part) => part !== '')
      .map((part) =>
        parseValue(
          part,
          siblings.find((candidate) => candidate.name === field)
        )
      )
    const single = parseValue(
      valueText,
      siblings.find((candidate) => candidate.name === field)
    )
    return nextComparator === 'in' || nextComparator === 'not_in'
      ? { field, [nextComparator]: values }
      : { field, [nextComparator]: single }
  }

  return (
    <FormField
      label="Show only if"
      className="sm:col-span-2"
      error={error}
      help="Hides this field unless another field in the same group has a matching value. Hidden fields keep their value and aren't required."
    >
      <div className="grid gap-2 sm:grid-cols-[1fr_10rem_1fr_auto]" data-show-if-editor>
        <Select
          value={rule?.field || undefined}
          onValueChange={(field) => onChange(build(field, comparator, text))}
        >
          <SelectTrigger className="w-full" aria-label="Show if field">
            <SelectValue placeholder="Always show" />
          </SelectTrigger>
          <SelectContent>
            {siblings.map((field) => (
              <SelectItem key={field.name} value={field.name}>
                {field.label || field.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={comparator}
          disabled={!rule?.field}
          onValueChange={(next) => onChange(build(rule!.field, next as typeof comparator, text))}
        >
          <SelectTrigger className="w-full" aria-label="Show if comparison">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SHOW_IF_COMPARATORS.map((key) => (
              <SelectItem key={key} value={key}>
                {COMPARATOR_LABELS[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {sibling?.type === 'boolean' && !multiple ? (
          <Select
            value={text || undefined}
            disabled={!rule?.field}
            onValueChange={(next) => onChange(build(rule!.field, comparator, next))}
          >
            <SelectTrigger className="w-full" aria-label="Show if value">
              <SelectValue placeholder="Value" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">On</SelectItem>
              <SelectItem value="false">Off</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <Input
            aria-label="Show if value"
            disabled={!rule?.field}
            list={sibling?.options?.length ? `show-if-${sibling.name}` : undefined}
            placeholder={multiple ? 'a, b, c' : 'Value'}
            value={text}
            onChange={(event) => onChange(build(rule!.field, comparator, event.target.value))}
          />
        )}
        {sibling?.options?.length ? (
          <datalist id={`show-if-${sibling.name}`}>
            {sibling.options.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Always show"
          disabled={!rule}
          onClick={() => onChange(undefined)}
        >
          <X />
        </Button>
      </div>
    </FormField>
  )
}

function FieldRow({
  field,
  siblings,
  onChange,
  onRemove,
  onMove,
  first,
  last,
  path,
  depth,
  allowBlocks,
  placement,
}: {
  field: Field
  siblings: Field[]
  onChange: (field: Field) => void
  onRemove: () => void
  onMove: (offset: number) => void
  first: boolean
  last: boolean
  path: string
  depth: number
  allowBlocks: boolean
  placement: Placement
}) {
  const { errors, collections, blockTypes } = useFields()
  const pluginTypes = usePage().props.admin?.fieldTypes ?? []
  const hasErrors = errorsUnder(errors, path).length > 0
  const domId = path.replace(/\./g, '-')
  const [toggled, setOpen] = useState(!field.name)
  const open = toggled || hasErrors
  const [nameTouched, setNameTouched] = useState(Boolean(field.name))
  const moreErrors = ['help', 'tab', 'sidebar', 'showIf'].some((key) =>
    errorAt(errors, `${path}.${key}`)
  )
  const hasMore = Boolean(field.help || field.tab || field.sidebar || field.showIf)
  const [moreToggled, setMoreOpen] = useState(false)
  const moreOpen = moreToggled || moreErrors
  const update = (changes: Partial<Field>) => onChange({ ...field, ...changes })
  const without = (key: keyof Field) => {
    const next = { ...field }
    delete next[key]
    return next
  }
  const knownType =
    (FIELD_TYPES as readonly string[]).includes(field.type) ||
    pluginTypes.some((type) => type.type === field.type)
  const tabs = [
    ...new Set(siblings.map((sibling) => sibling.tab).filter((tab): tab is string => !!tab)),
  ]

  return (
    <div
      data-schema-field={field.name || 'new'}
      className={cn('rounded-lg border', hasErrors && 'border-destructive')}
    >
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          onClick={() => setOpen(!toggled)}
        >
          {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          <span className="truncate text-sm font-medium">
            {field.label || field.name || 'New field'}
          </span>
          <span className="text-muted-foreground font-mono text-xs">{field.name}</span>
          <span className="bg-muted rounded px-1.5 py-0.5 text-xs">
            {TYPE_LABELS[field.type as FieldType] ??
              pluginTypes.find((type) => type.type === field.type)?.label ??
              field.type}
          </span>
          {field.required && <span className="text-destructive text-xs">required</span>}
          {field.sidebar && <span className="text-muted-foreground text-xs">sidebar</span>}
          {field.tab && <span className="text-muted-foreground text-xs">tab: {field.tab}</span>}
          {field.showIf && <span className="text-muted-foreground text-xs">conditional</span>}
        </button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7"
          aria-label="Move field up"
          disabled={first}
          onClick={() => onMove(-1)}
        >
          <ArrowUp />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7"
          aria-label="Move field down"
          disabled={last}
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
          <FormField label="Label" error={errorAt(errors, `${path}.label`)}>
            <Input
              value={field.label ?? ''}
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
            help="Used in the API and templates."
            error={errorAt(errors, `${path}.name`)}
          >
            <Input
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
              onValueChange={(type) => onChange(switchFieldType(field, type))}
            >
              <SelectTrigger className="w-full" aria-label="Field type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {!knownType && <SelectItem value={field.type}>{field.type}</SelectItem>}
                {FIELD_TYPES.filter((type) => allowBlocks || type !== 'blocks').map((type) => (
                  <SelectItem key={type} value={type}>
                    {TYPE_LABELS[type]}
                  </SelectItem>
                ))}
                {pluginTypes.map((type) => (
                  <SelectItem key={type.type} value={type.type}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <div className="flex items-end gap-2 pb-2">
            <Switch
              id={`${domId}-required`}
              checked={Boolean(field.required)}
              onCheckedChange={(required) =>
                onChange(required ? { ...field, required } : without('required'))
              }
            />
            <Label htmlFor={`${domId}-required`}>Required</Label>
          </div>
          {field.type === 'select' && (
            <FormField
              label="Options"
              help="One per line. Editors see them sorted, with a blank “—” choice."
              className="sm:col-span-2"
              error={errorAt(errors, `${path}.options`)}
            >
              <Textarea
                rows={4}
                value={(field.options ?? []).join('\n')}
                onChange={(event) => update({ options: event.target.value.split('\n') })}
                onBlur={() =>
                  update({ options: (field.options ?? []).map((o) => o.trim()).filter(Boolean) })
                }
              />
            </FormField>
          )}
          {(field.type === 'entry' || field.type === 'record_refs') && (
            <FormField
              label="Pick from collection"
              error={errorAt(errors, `${path}.collection`)}
              help="Leave on “Any collection” to allow entries from every collection."
            >
              <Select
                value={field.collection || ANY}
                onValueChange={(collection) =>
                  onChange(collection === ANY ? without('collection') : { ...field, collection })
                }
              >
                <SelectTrigger className="w-full" aria-label="Collection">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY}>Any collection</SelectItem>
                  {field.collection &&
                    !collections.some((collection) => collection.slug === field.collection) && (
                      <SelectItem value={field.collection}>{field.collection}</SelectItem>
                    )}
                  {collections.map((collection) => (
                    <SelectItem key={collection.slug} value={collection.slug}>
                      {collection.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          )}
          {field.type === 'code' && (
            <FormField label="Language" error={errorAt(errors, `${path}.language`)}>
              <Select
                value={field.language || 'plain'}
                onValueChange={(language) =>
                  onChange(language === 'plain' ? without('language') : { ...field, language })
                }
              >
                <SelectTrigger className="w-full" aria-label="Language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CODE_LANGUAGES.map((language) => (
                    <SelectItem key={language.value} value={language.value}>
                      {language.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          )}
          {field.type === 'blocks' && (
            <FormField
              label="Allowed blocks"
              help="Leave all unchecked to allow every block."
              className="sm:col-span-2"
            >
              <div className="grid gap-2 sm:grid-cols-3">
                {blockTypes.map((type) => (
                  <label key={type.slug} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={field.allowedTypes?.includes(type.slug) ?? false}
                      onCheckedChange={(checked) =>
                        update({
                          allowedTypes: checked
                            ? [...(field.allowedTypes ?? []), type.slug]
                            : (field.allowedTypes ?? []).filter((slug) => slug !== type.slug),
                        })
                      }
                    />
                    {type.label}
                  </label>
                ))}
              </div>
            </FormField>
          )}
          {(field.type === 'repeater' || field.type === 'group') && (
            <div className="grid gap-2 sm:col-span-2">
              <Label>Sub-fields</Label>
              {errorAt(errors, `${path}.of`) && (
                <p className="text-destructive text-xs">{errorAt(errors, `${path}.of`)}</p>
              )}
              <SchemaEditor
                value={field.of ?? []}
                onChange={(of) => update({ of })}
                path={`${path}.of`}
                depth={depth + 1}
                allowBlocks={false}
                placement="none"
              />
            </div>
          )}
          <Collapsible
            open={moreOpen}
            onOpenChange={setMoreOpen}
            className="grid gap-4 sm:col-span-2"
          >
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1 text-sm font-medium"
              >
                {moreOpen ? (
                  <ChevronDown className="size-4" />
                ) : (
                  <ChevronRight className="size-4" />
                )}
                More settings
                {hasMore && !moreOpen && <span className="bg-primary size-1.5 rounded-full" />}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Help text"
                className="sm:col-span-2"
                error={errorAt(errors, `${path}.help`)}
              >
                <Input
                  value={field.help ?? ''}
                  onChange={(event) =>
                    onChange(
                      event.target.value ? { ...field, help: event.target.value } : without('help')
                    )
                  }
                />
              </FormField>
              {placement !== 'none' && (
                <>
                  <FormField
                    label="Tab"
                    help="Fields with the same tab share a box in the editor."
                    error={errorAt(errors, `${path}.tab`)}
                  >
                    <Input
                      list={`${domId}-tabs`}
                      placeholder="General"
                      value={field.tab ?? ''}
                      onChange={(event) =>
                        onChange(
                          event.target.value
                            ? { ...field, tab: event.target.value }
                            : without('tab')
                        )
                      }
                    />
                    <datalist id={`${domId}-tabs`}>
                      {tabs.map((tab) => (
                        <option key={tab} value={tab} />
                      ))}
                    </datalist>
                  </FormField>
                  <div
                    className={cn('flex items-end gap-2 pb-2', placement !== 'full' && 'hidden')}
                  >
                    <Switch
                      id={`${domId}-sidebar`}
                      checked={Boolean(field.sidebar)}
                      onCheckedChange={(sidebar) =>
                        onChange(sidebar ? { ...field, sidebar } : without('sidebar'))
                      }
                    />
                    <Label htmlFor={`${domId}-sidebar`}>Show in the sidebar</Label>
                  </div>
                </>
              )}
              <ShowIfEditor
                rule={field.showIf}
                siblings={siblings.filter((sibling) => sibling !== field && sibling.name)}
                error={errorAt(errors, `${path}.showIf`)}
                onChange={(showIf) => onChange(showIf ? { ...field, showIf } : without('showIf'))}
              />
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}
    </div>
  )
}

export default function SchemaEditor({
  value,
  onChange,
  path = 'fields',
  depth = 0,
  allowBlocks = true,
  placement = 'full',
}: {
  value: Field[]
  onChange: (value: Field[]) => void
  path?: string
  depth?: number
  allowBlocks?: boolean
  placement?: Placement
}) {
  function move(index: number, offset: number) {
    const next = [...value]
    const [field] = next.splice(index, 1)
    next.splice(index + offset, 0, field)
    onChange(next)
  }

  return (
    <div className="grid gap-2">
      {value.map((field, index) => (
        <FieldRow
          key={index}
          field={field}
          siblings={value}
          path={`${path}.${index}`}
          depth={depth}
          allowBlocks={allowBlocks}
          placement={placement}
          first={index === 0}
          last={index === value.length - 1}
          onMove={(offset) => move(index, offset)}
          onRemove={() => onChange(value.filter((_, i) => i !== index))}
          onChange={(next) => onChange(value.map((current, i) => (i === index ? next : current)))}
        />
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-fit"
        onClick={() => onChange([...value, { name: '', label: '', type: 'string' }])}
      >
        <Plus />
        Add field
      </Button>
    </div>
  )
}
