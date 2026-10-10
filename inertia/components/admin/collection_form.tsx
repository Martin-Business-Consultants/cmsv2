import { useState, type FormEvent, type ReactNode } from 'react'
import { useForm, usePage } from '@inertiajs/react'
import type { BlockTypeOption, CollectionOption, Field } from '#types/content'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Textarea } from '~/components/ui/textarea'
import { Switch } from '~/components/ui/switch'
import { Label } from '~/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import FormField from '~/components/admin/form_field'
import CollectionPools from '~/components/admin/collection_pools'
import Icon from '~/components/admin/dynamic_icon'
import SchemaEditor from '~/components/fields/schema_editor'
import { FieldsProvider } from '~/components/fields/context'
import { slugify } from '~/lib/format'
import type { Errors } from '~/lib/errors'

export type CollectionFormData = {
  name: string
  singularName: string
  slug: string
  description: string
  icon: string
  urlPrefix: string
  fields: Field[]
  enableBlocks: boolean
  enableBody: boolean
  categoriesCollection?: string | null
  tagsCollection?: string | null
}

function singularize(name: string) {
  if (/ies$/i.test(name)) return name.replace(/ies$/i, 'y')
  if (/s$/i.test(name) && !/ss$/i.test(name)) return name.slice(0, -1)
  return name
}

export default function CollectionForm({
  initial,
  action,
  method,
  submitLabel,
  blockTypes,
  collections,
  footer,
}: {
  initial: CollectionFormData
  action: string
  method: 'post' | 'put'
  submitLabel: string
  blockTypes: BlockTypeOption[]
  collections: CollectionOption[]
  footer?: ReactNode
}) {
  const form = useForm<CollectionFormData>(initial)
  const { errors: shared } = usePage().props
  const errors = { ...(shared as Errors), ...(form.errors as Errors) }
  const [touched, setTouched] = useState({
    slug: Boolean(initial.slug),
    singularName: Boolean(initial.singularName),
  })

  function submit(event: FormEvent) {
    event.preventDefault()
    form.submit(method, action, { preserveScroll: true })
  }

  return (
    <FieldsProvider blockTypes={blockTypes} collections={collections} errors={errors}>
      <form onSubmit={submit} noValidate className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="grid min-w-0 content-start gap-6">
          <Card className="gap-4 py-5">
            <CardHeader className="px-5">
              <CardTitle>Details</CardTitle>
              <CardDescription>What this collection is called and where it lives.</CardDescription>
            </CardHeader>
            <CardContent className="grid items-start gap-4 px-5 sm:grid-cols-2">
              <FormField label="Name" htmlFor="name" error={errors.name as string} required>
                <Input
                  id="name"
                  placeholder="Posts"
                  value={form.data.name}
                  onChange={(event) => {
                    const name = event.target.value
                    form.setData((data) => ({
                      ...data,
                      name,
                      slug: touched.slug ? data.slug : slugify(name),
                      singularName: touched.singularName ? data.singularName : singularize(name),
                    }))
                  }}
                />
              </FormField>
              <FormField
                label="Singular name"
                htmlFor="singularName"
                error={errors.singularName as string}
                help="Used in buttons like “New post”."
                required
              >
                <Input
                  id="singularName"
                  placeholder="Post"
                  value={form.data.singularName}
                  onChange={(event) => {
                    setTouched((state) => ({ ...state, singularName: true }))
                    form.setData('singularName', event.target.value)
                  }}
                />
              </FormField>
              <FormField
                label="Slug"
                htmlFor="slug"
                error={errors.slug as string}
                help="Used by the API and by references. Lowercase letters, numbers, - and _."
                required
              >
                <Input
                  id="slug"
                  className="font-mono"
                  value={form.data.slug}
                  onChange={(event) => {
                    setTouched((state) => ({ ...state, slug: true }))
                    form.setData('slug', event.target.value)
                  }}
                />
              </FormField>
              <FormField
                label="URL prefix"
                htmlFor="urlPrefix"
                error={errors.urlPrefix as string}
                help={
                  form.data.urlPrefix
                    ? `Entries live at /${form.data.urlPrefix}/<slug>`
                    : 'Leave empty if entries have no public pages.'
                }
              >
                <div className="flex items-center">
                  <span className="text-muted-foreground bg-muted flex h-9 items-center rounded-l-md border border-r-0 px-2.5 font-mono text-sm">
                    /
                  </span>
                  <Input
                    id="urlPrefix"
                    className="rounded-l-none font-mono"
                    placeholder="blog"
                    value={form.data.urlPrefix}
                    onChange={(event) => form.setData('urlPrefix', event.target.value)}
                  />
                </div>
              </FormField>
              <FormField
                label="Icon"
                htmlFor="icon"
                error={errors.icon as string}
                help={
                  <>
                    Any{' '}
                    <a
                      href="https://lucide.dev/icons"
                      target="_blank"
                      rel="noreferrer"
                      className="underline"
                    >
                      Lucide icon
                    </a>{' '}
                    name, e.g. newspaper or calendar-days.
                  </>
                }
              >
                <div className="flex items-center gap-2">
                  <span className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-md border">
                    <Icon name={form.data.icon} className="size-4" />
                  </span>
                  <Input
                    id="icon"
                    className="font-mono"
                    placeholder="newspaper"
                    value={form.data.icon}
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
            </CardContent>
          </Card>
          <Card className="gap-4 py-5">
            <CardHeader className="px-5">
              <CardTitle>Fields</CardTitle>
              <CardDescription>
                Every entry has a title, slug and SEO settings. Add the rest here.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-5">
              {typeof errors.fields === 'string' && (
                <p className="text-destructive mb-3 text-xs">{errors.fields}</p>
              )}
              <SchemaEditor
                value={form.data.fields}
                onChange={(fields) => form.setData('fields', fields)}
              />
            </CardContent>
          </Card>
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
            </CardContent>
          </Card>
          <Card className="gap-3 py-4">
            <CardHeader className="px-4">
              <CardTitle className="text-sm">Entry editor</CardTitle>
              <CardDescription className="text-xs">
                What every entry has besides its fields.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 px-4">
              <div className="flex items-start gap-3">
                <Switch
                  id="enableBody"
                  checked={form.data.enableBody}
                  onCheckedChange={(checked) => form.setData('enableBody', checked)}
                />
                <div className="grid gap-0.5">
                  <Label htmlFor="enableBody">Body</Label>
                  <p className="text-muted-foreground text-xs">Give each entry a rich-text body.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Switch
                  id="enableBlocks"
                  checked={form.data.enableBlocks}
                  onCheckedChange={(checked) => form.setData('enableBlocks', checked)}
                />
                <div className="grid gap-0.5">
                  <Label htmlFor="enableBlocks">Blocks</Label>
                  <p className="text-muted-foreground text-xs">
                    Compose each entry from the block library.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <CollectionPools
            slug={form.data.slug}
            collections={collections}
            categories={form.data.categoriesCollection}
            tags={form.data.tagsCollection}
            errors={{
              categories: errors.categoriesCollection as string | undefined,
              tags: errors.tagsCollection as string | undefined,
            }}
            onChange={(changes) => form.setData((data) => ({ ...data, ...changes }))}
          />
          {footer}
        </div>
      </form>
    </FieldsProvider>
  )
}
