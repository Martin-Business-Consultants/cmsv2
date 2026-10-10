import { Head } from '@inertiajs/react'
import type { Data } from '@generated/data'
import type { CollectionOption } from '#types/content'
import type { InertiaProps } from '~/types'
import PageHeader from '~/components/admin/page_header'
import CollectionForm from '~/components/admin/collection_form'
import { urlFor } from '~/client'

type Props = InertiaProps<{
  blockTypes: Data.BlockType[]
  collections: CollectionOption[]
}>

export default function CollectionsCreate({ blockTypes, collections }: Props) {
  return (
    <>
      <Head title="New collection" />
      <PageHeader
        title="New collection"
        back={{ href: urlFor('admin.collections.index'), label: 'Collections' }}
      />
      <CollectionForm
        initial={{
          name: '',
          singularName: '',
          slug: '',
          description: '',
          icon: '',
          urlPrefix: '',
          fields: [],
          enableBlocks: false,
          enableBody: true,
        }}
        action={urlFor('admin.collections.store')}
        method="post"
        submitLabel="Create collection"
        blockTypes={blockTypes}
        collections={collections}
      />
    </>
  )
}
