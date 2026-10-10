import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { useForm, usePage } from '@inertiajs/react'
import { iconNames } from 'lucide-react/dynamic'
import { Braces, ChevronDown, ChevronRight, Search } from 'lucide-react'
import {
  normalizeDefinitions,
  type BlockTypeOption,
  type CollectionOption,
  type Field,
  type FieldData,
} from '#types/content'
import { Checkbox } from '~/components/ui/checkbox'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '~/components/ui/collapsible'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Textarea } from '~/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'
import FormField from '~/components/admin/form_field'
import Icon from '~/components/admin/dynamic_icon'
import SchemaEditor from '~/components/fields/schema_editor'
import FieldsForm from '~/components/fields/fields_form'
import { FieldsProvider } from '~/components/fields/context'
import { errorsUnder, type Errors } from '~/lib/errors'
import { snakeify } from '~/lib/format'
import { cn } from '~/lib/utils'

export type BlockTypeFormData = {
  label: string
  slug: string
  category: string
  description: string
  icon: string
  fields: Field[]
  defaults: FieldData
  deprecated: boolean
  version: number
}

const known = new Set<string>(iconNames)

function IconPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const matches = useMemo(() => {
    const term = search.trim().toLowerCase()
    return iconNames.filter((name) => !term || name.includes(term)).slice(0, 72)
  }, [search])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="icon" aria-label="Browse icons">
          <Icon name={value} className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-3">
        <div className="relative mb-3">
          <Search className="text-muted-foreground absolute top-2.5 left-2.5 size-4" />
          <Input
            autoFocus
            className="pl-8"
            placeholder="Search icons…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="grid max-h-64 grid-cols-8 gap-1 overflow-y-auto">
          {open &&
            matches.map((name) => (
              <button
                key={name}
                type="button"
                title={name}
                onClick={() => {
                  onChange(name)
                  setOpen(false)
                }}
                className={cn(
                  'hover:bg-accent flex aspect-square items-center justify-center rounded-md',
                  name === value && 'bg-accent ring-ring ring-1'
                )}
              >
                <Icon name={name} className="size-4" />
              </button>
            ))}
        </div>
        {matches.length === 0 && (
          <p className="text-muted-foreground py-6 text-center text-sm">No icons match.</p>
        )}
      </PopoverContent>
    </Popover>
  )
}

export default function BlockTypeForm({
  initial,
  action,
  method,
  blockTypes,
  collections,
  categories,
  submitLabel,
  sidebar,
  builtIn = false,
}: {
  initial: BlockTypeFormData
  action: string
  method: 'post' | 'put'
  blockTypes: BlockTypeOption[]
  collections: CollectionOption[]
  categories: string[]
  submitLabel: string
  sidebar?: ReactNode
  builtIn?: boolean
}) {
  const form = useForm<BlockTypeFormData>(initial)
  const { errors: shared } = usePage().props
  const errors = { ...(shared as Errors), ...(form.errors as Errors) }
  const creating = method === 'post'
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.slug))
  const fieldErrors = errorsUnder(errors, 'fields').length
  const defaultErrors = errorsUnder(errors, 'defaults').length
  const namedFields = form.data.fields.filter((field) => field.name)
  const [jsonOpen, setJsonOpen] = useState(false)
  const [json, setJson] = useState('')
  const [jsonError, setJsonError] = useState<string | null>(null)

  function definitionJson() {
    const { slug, label, description, category, icon, deprecated, version, fields, defaults } =
      form.data
    return JSON.stringify(
      { slug, label, description, category, icon, deprecated, version, fields, defaults },
      null,
      2
    )
  }

  function applyJson() {
    let parsed: unknown
    try {
      parsed = JSON.parse(json)
    } catch (error) {
      setJsonError(`That isn't valid JSON: ${(error as Error).message}`)
      return
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      setJsonError('The definition must be a JSON object.')
      return
    }
    const definition = parsed as Record<string, any>
    if (definition.fields !== undefined && !Array.isArray(definition.fields)) {
      setJsonError('"fields" must be a list of field definitions.')
      return
    }
    const text = (value: unknown, fallback: string) =>
      typeof value === 'string' ? value : value === null ? '' : fallback
    form.setData((data) => ({
      ...data,
      slug: creating ? text(definition.slug, data.slug) : data.slug,
      label: text(definition.label, data.label),
      description: text(definition.description, data.description),
      category: text(definition.category, data.category),
      icon: text(definition.icon, data.icon),
      deprecated:
        typeof definition.deprecated === 'boolean' ? definition.deprecated : data.deprecated,
      version: Number.isInteger(definition.version) ? definition.version : data.version,
      fields: Array.isArray(definition.fields)
        ? normalizeDefinitions(definition.fields)
        : data.fields,
      defaults:
        definition.defaults && typeof definition.defaults === 'object'
          ? definition.defaults
          : data.defaults,
    }))
    setSlugTouched(true)
    setJsonError(null)
    setJsonOpen(false)
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    form.submit(method, action, { preserveScroll: true })
  }

  const preview: BlockTypeOption = {
    slug: form.data.slug,
    label: form.data.label,
    category: form.data.category,
    description: form.data.description,
    icon: form.data.icon,
    fields: form.data.fields,
    defaults: form.data.defaults,
    deprecated: form.data.deprecated,
    version: form.data.version,
  }
  const editorTypes = blockTypes.some((type) => type.slug === preview.slug)
    ? blockTypes.map((type) => (type.slug === preview.slug ? preview : type))
    : [...blockTypes, preview]

  return (
    <FieldsProvider blockTypes={editorTypes} collections={collections} errors={errors}>
      <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="grid min-w-0 content-start gap-6">
          <Card className="gap-4">
            <CardHeader>
              <CardTitle>Details</CardTitle>
              <CardDescription>
                How editors find this block in the “Add block” picker.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <FormField label="Label" htmlFor="label" error={errors.label as string} required>
                <Input
                  id="label"
                  value={form.data.label}
                  onChange={(event) => {
                    const label = event.target.value
                    form.setData((data) => ({
                      ...data,
                      label,
                      slug: creating && !slugTouched ? snakeify(label) : data.slug,
                    }))
                  }}
                />
              </FormField>
              <FormField
                label="Slug"
                htmlFor="slug"
                error={errors.slug as string}
                help={
                  creating
                    ? 'Stored with every block of this type. It can’t be changed later.'
                    : 'Content refers to this slug, so it can’t be changed.'
                }
              >
                <Input
                  id="slug"
                  className="font-mono"
                  value={form.data.slug}
                  disabled={!creating}
                  onChange={(event) => {
                    setSlugTouched(true)
                    form.setData('slug', event.target.value)
                  }}
                />
              </FormField>
              <FormField
                label="Category"
                htmlFor="category"
                error={errors.category as string}
                help="Groups blocks in the picker."
              >
                <Input
                  id="category"
                  list="block-type-categories"
                  value={form.data.category}
                  placeholder="Sections"
                  onChange={(event) => form.setData('category', event.target.value)}
                />
                <datalist id="block-type-categories">
                  {categories.map((category) => (
                    <option key={category} value={category} />
                  ))}
                </datalist>
              </FormField>
              <FormField
                label="Icon"
                htmlFor="icon"
                error={errors.icon as string}
                help={
                  form.data.icon && !known.has(form.data.icon) ? (
                    <span className="text-amber-600">Not a known Lucide icon.</span>
                  ) : (
                    'A Lucide icon name, like layout-template.'
                  )
                }
              >
                <div className="flex gap-2">
                  <IconPicker
                    value={form.data.icon}
                    onChange={(icon) => form.setData('icon', icon)}
                  />
                  <Input
                    id="icon"
                    className="font-mono"
                    value={form.data.icon}
                    placeholder="box"
                    onChange={(event) => form.setData('icon', event.target.value.trim())}
                  />
                </div>
              </FormField>
              <FormField
                label="Description"
                htmlFor="description"
                error={errors.description as string}
                className="sm:col-span-2"
              >
                <Textarea
                  id="description"
                  rows={2}
                  value={form.data.description}
                  onChange={(event) => form.setData('description', event.target.value)}
                />
              </FormField>
              <FormField
                label="Version"
                htmlFor="version"
                error={errors.version as string}
                help="Stamped on each new block of this type, so a frontend can tell old block data apart."
              >
                <Input
                  id="version"
                  type="number"
                  min={1}
                  step={1}
                  className="max-w-28"
                  value={form.data.version}
                  onChange={(event) =>
                    form.setData(
                      'version',
                      Math.max(1, Number.parseInt(event.target.value, 10) || 1)
                    )
                  }
                />
              </FormField>
              <label className="flex items-start gap-2 self-center text-sm">
                <Checkbox
                  id="deprecated"
                  className="mt-0.5"
                  checked={form.data.deprecated}
                  onCheckedChange={(checked) => form.setData('deprecated', checked === true)}
                />
                <span>
                  <span className="font-medium">Deprecated</span>
                  <span className="text-muted-foreground block text-xs">
                    Tucked away under “Deprecated” in the block picker; kept on pages that have one.
                  </span>
                </span>
              </label>
            </CardContent>
          </Card>

          <Card className="gap-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Fields
                {fieldErrors > 0 && (
                  <span className="text-destructive text-xs font-normal">
                    Check the fields below
                  </span>
                )}
              </CardTitle>
              <CardDescription>What editors fill in for each block of this type.</CardDescription>
            </CardHeader>
            <CardContent>
              <SchemaEditor
                placement="none"
                value={form.data.fields}
                onChange={(fields) => form.setData('fields', fields)}
              />
            </CardContent>
          </Card>

          <Card className="gap-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Defaults
                {defaultErrors > 0 && (
                  <span className="text-destructive text-xs font-normal">
                    Check the defaults below
                  </span>
                )}
              </CardTitle>
              <CardDescription>
                Pre-filled values for a newly added block. Required fields can be left empty here.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {namedFields.length === 0 ? (
                <p className="text-muted-foreground text-sm">Add a field to set its default.</p>
              ) : (
                <FieldsForm
                  fields={namedFields.map((field) => ({ ...field, required: false }))}
                  value={form.data.defaults}
                  path="defaults"
                  onChange={(defaults) => form.setData('defaults', defaults)}
                />
              )}
            </CardContent>
          </Card>

          <Collapsible
            open={jsonOpen}
            onOpenChange={(open) => {
              if (open) {
                setJson(definitionJson())
                setJsonError(null)
              }
              setJsonOpen(open)
            }}
          >
            <Card className="gap-4 py-4">
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 px-6 text-left text-sm font-medium"
                  data-json-toggle
                >
                  {jsonOpen ? (
                    <ChevronDown className="size-4" />
                  ) : (
                    <ChevronRight className="size-4" />
                  )}
                  <Braces className="size-4" />
                  Paste or edit the whole definition as JSON
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="grid gap-3 px-6">
                <Textarea
                  aria-label="Block type definition JSON"
                  rows={16}
                  spellCheck={false}
                  className="font-mono text-xs"
                  value={json}
                  onChange={(event) => setJson(event.target.value)}
                />
                {jsonError && <p className="text-destructive text-xs">{jsonError}</p>}
                <p className="text-muted-foreground text-xs">
                  The shape the starter pack uses: slug, label, description, category, icon,
                  deprecated, version, fields and defaults. It replaces the form above; save to keep
                  it.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-fit"
                  onClick={applyJson}
                >
                  Use this JSON
                </Button>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </div>

        <div className="grid content-start gap-4">
          <Card className="gap-4 py-4">
            <CardContent className="grid gap-3 px-4">
              <Button type="submit" disabled={form.processing}>
                {form.processing ? 'Saving…' : submitLabel}
              </Button>
              {form.isDirty && (
                <p className="text-muted-foreground text-xs">You have unsaved changes.</p>
              )}
              {!creating && (
                <p className="text-muted-foreground text-xs">
                  {builtIn
                    ? 'Built-in: installed with the starter block types.'
                    : 'Custom: made on this site.'}
                </p>
              )}
            </CardContent>
          </Card>
          <Card className="gap-3 py-4">
            <CardHeader className="px-4">
              <CardTitle className="text-sm">Preview</CardTitle>
            </CardHeader>
            <CardContent className="px-4">
              <div className="flex items-start gap-3 rounded-lg border p-3">
                <div className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-md">
                  <Icon name={form.data.icon} className="size-4" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">
                    {form.data.label || 'Untitled block'}
                  </div>
                  <div className="text-muted-foreground line-clamp-2 text-xs">
                    {form.data.description ||
                      `${form.data.category || 'Other'} · ${namedFields.length} fields`}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          {sidebar}
        </div>
      </form>
    </FieldsProvider>
  )
}
