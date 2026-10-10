import { useState } from 'react'
import { router, useForm, usePage } from '@inertiajs/react'
import { ExternalLink, ListPlus } from 'lucide-react'
import { Link } from '@adonisjs/inertia/react'
import type {
  Block,
  BlockTypeOption,
  CollectionOption,
  Field,
  FieldData,
  Seo,
  Status,
} from '#types/content'
import { Input } from '~/components/ui/input'
import { Card } from '~/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import FormField from '~/components/admin/form_field'
import Postbox from '~/components/admin/postbox'
import PublishPanel, { type PublishTarget } from '~/components/admin/publish_panel'
import ApiJsonPanel, { type ApiPreview } from '~/components/admin/api_json_panel'
import {
  EditorNotices,
  EditorTabs,
  ReferenceBox,
  StatusLine,
  cancelOnEscape,
  compactSeo,
  useEditorTab,
} from '~/components/admin/editor_kit'
import BlocksEditor from '~/components/fields/blocks_editor'
import { FieldPostboxes, SidebarFields } from '~/components/fields/field_sections'
import SeoFields from '~/components/fields/seo_fields'
import { FieldsProvider } from '~/components/fields/context'
import { useCan } from '~/hooks/use_can'
import { slugify } from '~/lib/format'
import { errorAt, type Errors } from '~/lib/errors'
import RecordMetaPostboxes, {
  localePrefix,
  type RecordMeta,
  type RecordMetaData,
} from '~/components/admin/record_meta'

export type PageFormData = {
  title: string
  slug: string
  parentId: number | null
  blocks: Block[]
  frontmatter?: FieldData
  seo: Record<string, any>
  status: Status
  publishAt: string | null
  unpublishAt: string | null
  lockVersion?: number
} & RecordMetaData

export type PageRecord = {
  target: PublishTarget
  reference: string
  publicPath: string
  isLive: boolean
  updatedAt: string | null
  editHref: string
  fieldsHref?: string
  apiPreview?: ApiPreview
}

export default function PageEditor({
  initial,
  action,
  method,
  backHref,
  blockTypes,
  collections,
  parents,
  fields = [],
  record,
  onSaved,
  meta,
}: {
  initial: PageFormData
  action: string
  method: 'post' | 'put'
  backHref: string
  blockTypes: BlockTypeOption[]
  collections: CollectionOption[]
  parents: { id: number; title: string; path: string }[]
  fields?: Field[]
  record?: PageRecord
  onSaved?: () => void
  meta?: RecordMeta
}) {
  const can = useCan()
  const form = useForm<PageFormData>(initial)
  const { errors: shared } = usePage().props
  const errors = { ...(shared as Errors), ...(form.errors as Errors) }
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.slug))
  const [tab, selectTab] = useEditorTab((next) => {
    if (next === 'json' && record && !record.apiPreview) {
      router.reload({
        only: ['apiPreview'],
        onFinish: () => window.history.replaceState(window.history.state, '', '#json'),
      })
    }
  })

  function submit(status?: Status) {
    form.transform((data) => ({
      ...data,
      status: status ?? data.status,
      seo: compactSeo(data.seo),
    }))
    form.submit(method, action, { preserveScroll: true, onSuccess: () => onSaved?.() })
  }

  const parentPath = parents.find((parent) => parent.id === form.data.parentId)?.path
  const address = `${localePrefix(meta, form.data.locale)}/${parentPath ? `${parentPath}/` : ''}${form.data.slug === 'home' && !parentPath ? '' : form.data.slug}`
  const target: PublishTarget = record?.target ?? {
    noun: 'page',
    savedStatus: null,
    publishedAt: null,
    versionsCount: 0,
    canDelete: false,
  }

  const seoFields = (
    <SeoFields
      value={form.data.seo as Seo}
      fallbackTitle={form.data.title}
      onChange={(seo) => form.setData('seo', seo)}
    />
  )

  return (
    <FieldsProvider blockTypes={blockTypes} collections={collections} errors={errors}>
      {record && <EditorTabs tab={tab} onSelect={selectTab} errors={errors} />}
      <EditorNotices errors={errors} reviewHref={record?.editHref} />
      <form
        hidden={tab === 'json'}
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
        onKeyDown={cancelOnEscape(backHref, form.isDirty)}
        noValidate
        className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start"
      >
        <div className="grid min-w-0 content-start gap-6">
          <div className="grid gap-1">
            <label htmlFor="title" className="sr-only">
              Title
            </label>
            <Input
              id="title"
              placeholder="Add title"
              className="h-auto rounded-none border-0 border-b bg-transparent px-0 pb-3 text-3xl font-semibold tracking-tight shadow-none focus-visible:ring-0 md:text-3xl dark:bg-transparent"
              value={form.data.title}
              autoFocus={!record}
              onChange={(event) => {
                const title = event.target.value
                form.setData((data) => ({
                  ...data,
                  title,
                  slug: slugTouched ? data.slug : slugify(title),
                }))
              }}
            />
            {errorAt(errors, 'title') && (
              <p className="text-destructive text-xs">{errorAt(errors, 'title')}</p>
            )}
          </div>
          <div hidden={tab !== 'edit'} className="grid gap-6">
            <FieldPostboxes
              id="page-fields"
              fields={fields}
              value={form.data.frontmatter ?? {}}
              path="frontmatter"
              onChange={(frontmatter) => form.setData('frontmatter', frontmatter)}
            />
            <Postbox
              id="page-blocks"
              title="Blocks"
              footer={<StatusLine blocks={form.data.blocks.length} updatedAt={record?.updatedAt} />}
            >
              <BlocksEditor
                value={form.data.blocks}
                path="blocks"
                onChange={(blocks) => form.setData('blocks', blocks)}
              />
            </Postbox>
          </div>
          {record ? (
            <Card className="gap-0 py-0" hidden={tab !== 'seo'}>
              <h2 className="border-b px-5 py-3.5 text-sm font-semibold">SEO</h2>
              {seoFields}
            </Card>
          ) : (
            <Postbox id="page-seo" title="SEO" flush>
              {seoFields}
            </Postbox>
          )}
        </div>
        <aside className="grid min-w-0 content-start gap-4">
          <PublishPanel
            target={target}
            state={{
              status: form.data.status,
              publishAt: form.data.publishAt,
              unpublishAt: form.data.unpublishAt,
            }}
            errors={{
              status: errorAt(errors, 'status'),
              publishAt: errorAt(errors, 'publishAt'),
              unpublishAt: errorAt(errors, 'unpublishAt'),
            }}
            canPublish={can('pages:publish')}
            dirty={form.isDirty}
            processing={form.processing}
            onChange={(changes) => form.setData((data) => ({ ...data, ...changes }))}
            onSubmit={submit}
          />
          <Postbox id="page-attributes" title="Page Attributes">
            <FormField
              label="Slug"
              htmlFor="slug"
              error={errorAt(errors, 'slug')}
              help="Lowercase letters, digits and dashes."
            >
              <Input
                id="slug"
                className="font-mono"
                placeholder="lowercase-with-dashes"
                autoComplete="off"
                spellCheck={false}
                value={form.data.slug}
                onChange={(event) => {
                  const slug = event.target.value
                  setSlugTouched(slug !== '')
                  form.setData('slug', slug === '' ? slugify(form.data.title) : slug)
                }}
              />
            </FormField>
            <div className="grid min-w-0 gap-1.5">
              <span className="text-sm font-medium">Permalink</span>
              {record?.isLive ? (
                <a
                  href={record.publicPath}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary inline-flex min-w-0 items-center gap-1 truncate text-sm underline-offset-4 hover:underline"
                >
                  <span className="truncate">{address}</span>
                  <ExternalLink className="size-3.5 shrink-0" />
                </a>
              ) : (
                <span className="text-muted-foreground truncate font-mono text-xs">{address}</span>
              )}
            </div>
            <FormField
              label="Parent"
              error={errorAt(errors, 'parentId')}
              help="Nests this page under another; its URL becomes the parent's path plus its slug."
            >
              <Select
                value={form.data.parentId ? String(form.data.parentId) : 'none'}
                onValueChange={(value) =>
                  form.setData('parentId', value === 'none' ? null : Number(value))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No parent (top level)</SelectItem>
                  {parents.map((parent) => (
                    <SelectItem key={parent.id} value={String(parent.id)}>
                      {'  '.repeat(parent.path.split('/').length - 1)}/{parent.path}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <SidebarFields
              fields={fields}
              value={form.data.frontmatter ?? {}}
              path="frontmatter"
              onChange={(frontmatter) => form.setData('frontmatter', frontmatter)}
            />
            {record && <ReferenceBox reference={record.reference} />}
            {record?.fieldsHref && (
              <Link
                href={record.fieldsHref}
                className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1.5 text-xs underline-offset-4 hover:underline"
              >
                <ListPlus className="size-3.5" />
                {fields.length ? 'Edit this page’s fields' : 'Add fields to this page'}
              </Link>
            )}
          </Postbox>
          <RecordMetaPostboxes
            kind="page"
            meta={meta}
            data={form.data}
            onChange={(changes) => form.setData((data) => ({ ...data, ...changes }))}
            errors={errors}
            dirty={form.isDirty}
          />
        </aside>
      </form>
      {record && tab === 'json' && <ApiJsonPanel preview={record.apiPreview} noun="page" />}
    </FieldsProvider>
  )
}
