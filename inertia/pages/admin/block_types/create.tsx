import { Head } from '@inertiajs/react'
import type { Data } from '@generated/data'
import type { CollectionOption } from '#types/content'
import type { InertiaProps } from '~/types'
import PageHeader from '~/components/admin/page_header'
import BlockTypeForm from '~/components/admin/block_type_form'
import { urlFor } from '~/client'

type Props = InertiaProps<{
  blockTypes: Data.BlockType[]
  collections: CollectionOption[]
  categories: string[]
}>

export default function BlockTypesCreate({ blockTypes, collections, categories }: Props) {
  return (
    <>
      <Head title="New block type" />
      <PageHeader
        title="New block type"
        back={{ href: urlFor('admin.block_types.index'), label: 'Block types' }}
      />
      <BlockTypeForm
        initial={{
          label: '',
          slug: '',
          category: '',
          description: '',
          icon: '',
          fields: [],
          defaults: {},
          deprecated: false,
          version: 1,
        }}
        action={urlFor('admin.block_types.store')}
        method="post"
        submitLabel="Create block type"
        blockTypes={blockTypes}
        collections={collections}
        categories={categories}
      />
    </>
  )
}
