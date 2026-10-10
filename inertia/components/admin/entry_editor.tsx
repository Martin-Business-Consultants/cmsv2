import { useState } from 'react'
import { router, useForm, usePage } from '@inertiajs/react'
import { ExternalLink } from 'lucide-react'
import type {
  Block,
  BlockTypeOption,
  CollectionOption,
  Field,
  FieldData,
  RichTextDoc,
  Seo,
  Status,
} from '#types/content'
import { Input } from '~/components/ui/input'
import { Card } from '~/components/ui/card'
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
import RichTextEditor from '~/components/fields/rich_text_editor'
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

export type EntryFormData = {
  title: string
  slug: string
  data: FieldData
  body: RichTextDoc | null
  blocks: Block[]
  seo: Record<string, any>
  status: Status
  publishAt: string | null
  unpublishAt: string | null
  lockVersion?: number
} & RecordMetaData

export type EntryRecord = {
  target: PublishTarget
  reference: string
  publicPath: string | null
  isLive: boolean
  updatedAt: string | null
  editHref: string
  apiPreview?: ApiPreview
}

export default function EntryEditor({
  initial,
  action,
  method,
  backHref,
  fields,
  enableBlocks = false,
  enableBody = false,
  urlPrefix,
  noun,
  blockTypes,
  collections,
  record,
  onSaved,
  meta,
}: {
  initial: EntryFormData
  action: string
  method: 'post' | 'put'
  backHref: string
  blockTypes: BlockTypeOption[]
  collections: CollectionOption[]
  fields: Field[]
  enableBlocks?: boolean
  enableBody?: boolean
  urlPrefix: string | null
  noun: string
  record?: EntryRecord
  onSaved?: () => void
  meta?: RecordMeta
}) {
  const can = useCan()
  const form = useForm<EntryFormData>(initial)
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

  const address = urlPrefix
    ? `${localePrefix(meta, form.data.locale)}/${urlPrefix}/${form.data.slug}`
    : null
  const target: PublishTarget = record?.target ?? {
    noun,
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
          <div hidden={tab !== 'edit'}>
            <div className="grid gap-6">
              <FieldPostboxes
                id="entry-fields"
                fields={fields}
                value={form.data.data}
                path="data"
                onChange={(data) => form.setData('data', data)}
                footer={
                  !enableBlocks && !enableBody ? (
                    <StatusLine updatedAt={record?.updatedAt} />
                  ) : undefined
                }
              />
              {enableBlocks && (
                <Postbox
                  id="entry-blocks"
                  title="Blocks"
                  footer={
                    !enableBody ? (
                      <StatusLine blocks={form.data.blocks.length} updatedAt={record?.updatedAt} />
                    ) : undefined
                  }
                >
                  {typeof errors.blocks === 'string' && (
                    <p className="text-destructive text-xs">{errors.blocks}</p>
                  )}
                  <BlocksEditor
                    value={form.data.blocks}
                    path="blocks"
                    onChange={(blocks) => form.setData('blocks', blocks)}
                  />
                </Postbox>
              )}
              {enableBody && (
                <Postbox
                  id="entry-body"
                  title="Body"
                  footer={
                    <StatusLine
                      blocks={enableBlocks ? form.data.blocks.length : undefined}
                      updatedAt={record?.updatedAt}
                    />
                  }
                >
                  <RichTextEditor
                    id="body"
                    value={form.data.body}
                    onChange={(body) => form.setData('body', body)}
                  />
                  {errorAt(errors, 'body') && (
                    <p className="text-destructive text-xs">{errorAt(errors, 'body')}</p>
                  )}
                </Postbox>
              )}
              {fields.length === 0 && !enableBlocks && !enableBody && (
                <p className="text-muted-foreground rounded-xl border border-dashed px-4 py-8 text-center text-sm">
                  This collection has no fields yet. Add some under Structure → Collections.
                </p>
              )}
            </div>
          </div>
          {record ? (
            <Card className="gap-0 py-0" hidden={tab !== 'seo'}>
              <h2 className="border-b px-5 py-3.5 text-sm font-semibold">SEO</h2>
              {seoFields}
            </Card>
          ) : (
            <Postbox id="entry-seo" title="SEO" flush>
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
            canPublish={can('entries:publish')}
            dirty={form.isDirty}
            processing={form.processing}
            onChange={(changes) => form.setData((data) => ({ ...data, ...changes }))}
            onSubmit={submit}
          />
          <Postbox id="entry-attributes" title="Entry Attributes">
            <FormField
              label="Slug"
              htmlFor="slug"
              error={errorAt(errors, 'slug')}
              help="Made from the title when blank."
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
              {address && record?.isLive && record.publicPath ? (
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
                <span className="text-muted-foreground truncate font-mono text-xs">
                  {address ?? 'This collection has no public pages; the slug is used by the API.'}
                </span>
              )}
            </div>
            <SidebarFields
              fields={fields}
              value={form.data.data}
              path="data"
              onChange={(data) => form.setData('data', data)}
            />
            {record && <ReferenceBox reference={record.reference} />}
          </Postbox>
          <RecordMetaPostboxes
            kind="entry"
            meta={meta}
            data={form.data}
            onChange={(changes) => form.setData((data) => ({ ...data, ...changes }))}
            errors={errors}
            dirty={form.isDirty}
          />
        </aside>
      </form>
      {record && tab === 'json' && <ApiJsonPanel preview={record.apiPreview} noun={noun} />}
    </FieldsProvider>
  )
}
