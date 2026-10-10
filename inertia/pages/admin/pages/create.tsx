import { Head } from '@inertiajs/react'
import type { Data } from '@generated/data'
import type { CollectionOption } from '#types/content'
import type { InertiaProps } from '~/types'
import PageHeader from '~/components/admin/page_header'
import PageEditor from '~/components/admin/page_editor'
import { urlFor } from '~/client'
import type { TaxonomyEditor } from '~/components/admin/taxonomy_postbox'
import type { SiteLocales } from '~/components/admin/translations_postbox'
import { recordMetaInitial } from '~/components/admin/record_meta'

type Props = InertiaProps<{
  blockTypes: Data.BlockType[]
  collections: CollectionOption[]
  parents: { id: number; title: string; path: string }[]
  parentId: number | null
  taxonomy: TaxonomyEditor
  locales: SiteLocales
}>

export default function PagesCreate({
  blockTypes,
  collections,
  parents,
  parentId,
  taxonomy,
  locales,
}: Props) {
  const meta = { taxonomy, locales }
  return (
    <>
      <Head title="Add New Page" />
      <PageHeader
        title="Add New Page"
        back={{ href: urlFor('admin.pages.index'), label: 'Pages' }}
      />
      <PageEditor
        initial={{
          title: '',
          slug: '',
          parentId,
          blocks: [],
          seo: {},
          status: 'draft',
          publishAt: null,
          unpublishAt: null,
          ...recordMetaInitial(meta),
        }}
        action={urlFor('admin.pages.store')}
        method="post"
        backHref={urlFor('admin.pages.index')}
        blockTypes={blockTypes}
        collections={collections}
        parents={parents}
        meta={meta}
      />
    </>
  )
}
