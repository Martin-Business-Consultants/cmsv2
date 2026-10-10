import { useState } from 'react'
import { Head } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { Plus } from 'lucide-react'
import type { Data } from '@generated/data'
import type { Block, CollectionOption, RichTextDoc, Status } from '#types/content'
import type { InertiaProps } from '~/types'
import { Button } from '~/components/ui/button'
import PageHeader from '~/components/admin/page_header'
import EntryEditor from '~/components/admin/entry_editor'
import type { ApiPreview } from '~/components/admin/api_json_panel'
import { useCan } from '~/hooks/use_can'
import { urlFor } from '~/client'
import type { TaxonomyEditor } from '~/components/admin/taxonomy_postbox'
import type { SiteLocales, TranslationLink } from '~/components/admin/translations_postbox'
import { recordMetaInitial } from '~/components/admin/record_meta'

type Props = InertiaProps<{
  collection: Data.Collection
  entry: Data.Entry
  blockTypes: Data.BlockType[]
  collections: CollectionOption[]
  versionsCount: number
  apiPreview?: ApiPreview
  taxonomy: TaxonomyEditor
  locales: SiteLocales
  translations: TranslationLink[]
}>

export default function EntriesEdit({
  collection,
  entry,
  blockTypes,
  collections,
  versionsCount,
  apiPreview,
  taxonomy,
  locales,
  translations,
}: Props) {
  const can = useCan()
  const [revision, setRevision] = useState(0)
  const params = { collectionId: collection.id, id: entry.id }
  const noun = collection.singularName.toLowerCase()
  const backHref = urlFor('admin.entries.index', { collectionId: collection.id })
  const meta = {
    taxonomy,
    locales,
    translations,
    addTranslationHref: urlFor('admin.translations.entry', params),
    translationHref: (id: number) =>
      urlFor('admin.entries.edit', { collectionId: collection.id, id }),
  }

  return (
    <>
      <Head title={entry.title} />
      <PageHeader
        title={`Edit ${collection.singularName}`}
        back={{ href: backHref, label: collection.name }}
        actions={
          can('entries:write') && (
            <Button asChild variant="outline" size="sm">
              <Link route="admin.entries.create" routeParams={{ collectionId: collection.id }}>
                <Plus />
                Add New
              </Link>
            </Button>
          )
        }
      />
      <EntryEditor
        key={`${entry.id}-${revision}`}
        initial={{
          title: entry.title,
          slug: entry.slug,
          data: entry.data ?? {},
          body: (entry.body as RichTextDoc | null) ?? null,
          blocks: (entry.blocks as Block[] | null) ?? [],
          seo: entry.seo ?? {},
          status: entry.status as Status,
          publishAt: entry.publishAt,
          unpublishAt: entry.unpublishAt,
          lockVersion: entry.lockVersion,
          ...recordMetaInitial(meta, entry.locale),
        }}
        action={urlFor('admin.entries.update', params)}
        method="put"
        backHref={backHref}
        fields={collection.fields}
        enableBlocks={Boolean(collection.enableBlocks)}
        enableBody={Boolean(collection.enableBody)}
        urlPrefix={collection.urlPrefix}
        noun={noun}
        blockTypes={blockTypes}
        collections={collections}
        onSaved={() => setRevision((value) => value + 1)}
        meta={meta}
        record={{
          target: {
            noun,
            savedStatus: entry.status as Status,
            publishedAt: entry.publishedAt,
            versionsCount,
            versionsHref: urlFor('admin.entry_versions.index', params),
            previewHref: collection.urlPrefix ? urlFor('admin.previews.entry', params) : undefined,
            trashHref: urlFor('admin.entries.destroy', params),
            canDelete: can('entries:delete'),
          },
          reference: `${collection.slug}/${entry.slug}`,
          publicPath: entry.publicPath,
          isLive: entry.isLive,
          updatedAt: entry.updatedAt,
          editHref: urlFor('admin.entries.edit', params),
          apiPreview,
        }}
      />
    </>
  )
}
