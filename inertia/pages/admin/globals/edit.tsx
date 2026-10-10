import { useState, type FormEvent } from 'react'
import { Head, router, useForm, usePage } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { Plus } from 'lucide-react'
import type { Data } from '@generated/data'
import type { CollectionOption, Field, FieldData } from '#types/content'
import type { InertiaProps } from '~/types'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import PageHeader from '~/components/admin/page_header'
import FormField from '~/components/admin/form_field'
import Postbox from '~/components/admin/postbox'
import Icon from '~/components/admin/dynamic_icon'
import PublishPanel from '~/components/admin/publish_panel'
import { EditorNotices, ReferenceBox, cancelOnEscape } from '~/components/admin/editor_kit'
import FieldsForm from '~/components/fields/fields_form'
import SchemaEditor from '~/components/fields/schema_editor'
import { FieldsProvider } from '~/components/fields/context'
import { useCan } from '~/hooks/use_can'
import { errorAt, type Errors } from '~/lib/errors'
import { urlFor } from '~/client'

type Props = InertiaProps<{
  global: Data.Global
  blockTypes: Data.BlockType[]
  collections: CollectionOption[]
}>

type GlobalForm = {
  name: string
  slug: string
  description: string
  icon: string
  data: FieldData
  lockVersion: number
}

function groupByTab(fields: Field[]) {
  const groups = new Map<string, Field[]>()
  for (const field of fields) {
    const tab = (field as Field & { tab?: string }).tab || 'General'
    groups.set(tab, [...(groups.get(tab) ?? []), field])
  }
  return [...groups.entries()]
}

function ContentForm({
  global,
  onSaved,
  onEditFields,
}: {
  global: Data.Global
  onSaved: () => void
  onEditFields: () => void
}) {
  const can = useCan()
  const canWrite = can('globals:write')
  const canPublish = can('globals:publish')
  const form = useForm<GlobalForm>({
    name: global.name,
    slug: global.slug,
    description: global.description ?? '',
    icon: global.icon ?? '',
    data: global.data ?? {},
    lockVersion: global.lockVersion,
  })
  const { errors: shared } = usePage().props
  const errors = { ...(shared as Errors), ...(form.errors as Errors) }
  const readOnly = !canWrite || !canPublish
  const params = { id: global.id }
  const backHref = urlFor('admin.globals.index')

  function submit() {
    form.put(urlFor('admin.globals.update', params), { preserveScroll: true, onSuccess: onSaved })
  }

  return (
    <>
      <EditorNotices errors={errors} reviewHref={urlFor('admin.globals.edit', params)} />
      <form
        onSubmit={(event: FormEvent) => {
          event.preventDefault()
          if (!readOnly) submit()
        }}
        onKeyDown={cancelOnEscape(backHref, form.isDirty)}
        noValidate
        className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start"
      >
        <fieldset disabled={readOnly} className="grid min-w-0 content-start gap-6">
          <div className="grid gap-1">
            <label htmlFor="name" className="sr-only">
              Name
            </label>
            <Input
              id="name"
              placeholder="Add name"
              className="h-auto rounded-none border-0 border-b bg-transparent px-0 pb-3 text-3xl font-semibold tracking-tight shadow-none focus-visible:ring-0 md:text-3xl dark:bg-transparent"
              value={form.data.name}
              onChange={(event) => form.setData('name', event.target.value)}
            />
            {errorAt(errors, 'name') && (
              <p className="text-destructive text-xs">{errorAt(errors, 'name')}</p>
            )}
          </div>
          {global.fields.length === 0 ? (
            <div className="text-muted-foreground rounded-xl border border-dashed px-6 py-12 text-center text-sm">
              This global has no fields yet.{' '}
              {canWrite && (
                <button
                  type="button"
                  className="text-primary underline underline-offset-4"
                  onClick={onEditFields}
                >
                  Define its fields
                </button>
              )}
            </div>
          ) : (
            groupByTab(global.fields).map(([tab, fields]) => (
              <Postbox
                key={tab}
                id={`global-${tab.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                title={tab}
              >
                <FieldsForm
                  fields={fields}
                  value={form.data.data}
                  path="data"
                  onChange={(data) => form.setData('data', data)}
                />
              </Postbox>
            ))
          )}
        </fieldset>
        <aside className="grid min-w-0 content-start gap-4">
          <PublishPanel
            statusful={false}
            target={{
              noun: 'global',
              savedStatus: 'published',
              publishedAt: null,
              versionsCount: 0,
              trashHref: urlFor('admin.globals.destroy', params),
              canDelete: can('globals:delete'),
            }}
            canPublish={canWrite && canPublish}
            dirty={form.isDirty}
            processing={form.processing}
            onSubmit={submit}
          />
          <Postbox id="global-identity" title="Global">
            <fieldset disabled={readOnly} className="grid gap-4">
              <FormField label="Slug" htmlFor="slug" error={errorAt(errors, 'slug')} required>
                <Input
                  id="slug"
                  className="font-mono"
                  autoComplete="off"
                  value={form.data.slug}
                  onChange={(event) => form.setData('slug', event.target.value)}
                />
              </FormField>
              <FormField
                label="Description"
                htmlFor="description"
                error={errorAt(errors, 'description')}
              >
                <Input
                  id="description"
                  value={form.data.description}
                  onChange={(event) => form.setData('description', event.target.value)}
                />
              </FormField>
              <FormField
                label="Icon"
                htmlFor="icon"
                error={errorAt(errors, 'icon')}
                help="A lucide icon name, like globe or menu."
              >
                <div className="flex items-center gap-2">
                  <span className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-md border">
                    <Icon name={form.data.icon || 'globe'} className="size-4" />
                  </span>
                  <Input
                    id="icon"
                    autoComplete="off"
                    placeholder="globe"
                    value={form.data.icon}
                    onChange={(event) => form.setData('icon', event.target.value)}
                  />
                </div>
              </FormField>
            </fieldset>
            <ReferenceBox reference={`globals/${global.slug}`} />
          </Postbox>
        </aside>
      </form>
    </>
  )
}

function SchemaForm({ global, onSaved }: { global: Data.Global; onSaved: () => void }) {
  const form = useForm<{ fields: Field[]; lockVersion: number }>({
    fields: global.fields,
    lockVersion: global.lockVersion,
  })
  const { errors: shared } = usePage().props
  const errors = { ...(shared as Errors), ...(form.errors as Errors) }

  function submit(event: FormEvent) {
    event.preventDefault()
    form.put(urlFor('admin.globals.update_fields', { id: global.id }), {
      preserveScroll: true,
      onSuccess: onSaved,
    })
  }

  return (
    <form onSubmit={submit} noValidate className="grid max-w-3xl gap-4">
      <EditorNotices errors={errors} reviewHref={urlFor('admin.globals.edit', { id: global.id })} />
      <Card className="gap-4 py-5">
        <CardHeader className="px-5">
          <CardTitle>Fields</CardTitle>
          <CardDescription>
            Removing a field hides its saved value; renaming one starts it empty.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-5">
          <SchemaEditor
            placement="tabs"
            value={form.data.fields}
            onChange={(fields) => form.setData('fields', fields)}
          />
        </CardContent>
      </Card>
      <div className="flex items-center justify-end gap-3">
        {form.isDirty && (
          <span className="text-muted-foreground text-xs">You have unsaved changes.</span>
        )}
        <Button type="submit" disabled={form.processing}>
          {form.processing ? 'Saving…' : 'Save fields'}
        </Button>
      </div>
    </form>
  )
}

export default function GlobalsEdit({ global, blockTypes, collections }: Props) {
  const can = useCan()
  const { url, props } = usePage()
  const initialTab =
    new URLSearchParams(url.split('?')[1] ?? '').get('tab') === 'fields' ? 'fields' : 'content'
  const [tab, setTab] = useState(initialTab)
  const [revision, setRevision] = useState(0)
  const canWrite = can('globals:write')
  const saved = () => setRevision((value) => value + 1)

  function changeTab(value: string) {
    setTab(value)
    router.replace({
      url: urlFor(
        'admin.globals.edit',
        { id: global.id },
        { qs: value === 'fields' ? { tab: 'fields' } : {} }
      ),
      preserveState: true,
      preserveScroll: true,
    })
  }

  return (
    <>
      <Head title={global.name} />
      <PageHeader
        title="Edit Global"
        back={{ href: urlFor('admin.globals.index'), label: 'Globals' }}
        actions={
          canWrite && (
            <Button asChild variant="outline" size="sm">
              <Link route="admin.globals.create">
                <Plus />
                Add New
              </Link>
            </Button>
          )
        }
      />
      <FieldsProvider
        blockTypes={blockTypes}
        collections={collections}
        errors={props.errors as Errors}
      >
        <Tabs value={tab} onValueChange={changeTab} className="gap-4">
          <TabsList variant="line" className="h-auto w-full justify-start border-b pb-1">
            <TabsTrigger value="content" className="flex-none px-3">
              Content
            </TabsTrigger>
            {canWrite && (
              <TabsTrigger value="fields" className="flex-none px-3">
                Fields
              </TabsTrigger>
            )}
          </TabsList>
          <TabsContent value="content">
            <ContentForm
              key={revision}
              global={global}
              onSaved={saved}
              onEditFields={() => changeTab('fields')}
            />
          </TabsContent>
          {canWrite && (
            <TabsContent value="fields">
              <SchemaForm key={revision} global={global} onSaved={saved} />
            </TabsContent>
          )}
        </Tabs>
      </FieldsProvider>
    </>
  )
}
