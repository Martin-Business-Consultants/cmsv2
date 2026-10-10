import { Head } from '@inertiajs/react'
import type { Data } from '@generated/data'
import type { CollectionOption, FieldData } from '#types/content'
import type { InertiaProps } from '~/types'
import PageHeader from '~/components/admin/page_header'
import EntryEditor from '~/components/admin/entry_editor'
import { urlFor } from '~/client'
import type { TaxonomyEditor } from '~/components/admin/taxonomy_postbox'
import type { SiteLocales } from '~/components/admin/translations_postbox'
import { recordMetaInitial } from '~/components/admin/record_meta'

type Props = InertiaProps<{
  collection: Data.Collection
  defaults: FieldData
  blockTypes: Data.BlockType[]
  collections: CollectionOption[]
  taxonomy: TaxonomyEditor
  locales: SiteLocales
}>

export default function EntriesCreate({
  collection,
  defaults,
  blockTypes,
  collections,
  taxonomy,
  locales,
}: Props) {
  const meta = { taxonomy, locales }
  const title = `Add New ${collection.singularName}`
  const backHref = urlFor('admin.entries.index', { collectionId: collection.id })

  return (
    <>
      <Head title={title} />
      <PageHeader title={title} back={{ href: backHref, label: collection.name }} />
      <EntryEditor
        initial={{
          title: '',
          slug: '',
          data: defaults,
          body: null,
          blocks: [],
          seo: {},
          status: 'draft',
          publishAt: null,
          unpublishAt: null,
          ...recordMetaInitial(meta),
        }}
        action={urlFor('admin.entries.store', { collectionId: collection.id })}
        method="post"
        backHref={backHref}
        fields={collection.fields}
        enableBlocks={Boolean(collection.enableBlocks)}
        enableBody={Boolean(collection.enableBody)}
        urlPrefix={collection.urlPrefix}
        noun={collection.singularName.toLowerCase()}
        blockTypes={blockTypes}
        collections={collections}
        meta={meta}
      />
    </>
  )
}
