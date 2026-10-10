import { Head } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { ListIcon, Trash2 } from 'lucide-react'
import type { Data } from '@generated/data'
import type { CollectionOption } from '#types/content'
import type { InertiaProps } from '~/types'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import PageHeader from '~/components/admin/page_header'
import CollectionForm from '~/components/admin/collection_form'
import ConfirmAction from '~/components/admin/confirm_action'
import { useCan } from '~/hooks/use_can'
import { urlFor } from '~/client'

type Props = InertiaProps<{
  collection: Data.Collection
  blockTypes: Data.BlockType[]
  collections: CollectionOption[]
  pools: { categories: string | null; tags: string | null }
}>

export default function CollectionsEdit({ collection, blockTypes, collections, pools }: Props) {
  const can = useCan()
  const count = collection.entriesCount
  const plural = count === 1 ? 'entry' : 'entries'

  return (
    <>
      <Head title={collection.name} />
      <PageHeader
        title={collection.name}
        description={collection.description}
        back={{ href: urlFor('admin.collections.index'), label: 'Collections' }}
        actions={
          can('entries:read') && (
            <Button asChild variant="outline" size="sm">
              <Link route="admin.entries.index" routeParams={{ collectionId: collection.id }}>
                <ListIcon />
                {count} {plural}
              </Link>
            </Button>
          )
        }
      />
      <CollectionForm
        key={collection.updatedAt}
        initial={{
          name: collection.name,
          singularName: collection.singularName,
          slug: collection.slug,
          description: collection.description ?? '',
          icon: collection.icon ?? '',
          urlPrefix: collection.urlPrefix ?? '',
          fields: collection.fields,
          enableBlocks: Boolean(collection.enableBlocks),
          enableBody: Boolean(collection.enableBody),
          categoriesCollection: pools.categories,
          tagsCollection: pools.tags,
        }}
        action={urlFor('admin.collections.update', { id: collection.id })}
        method="put"
        submitLabel="Save"
        blockTypes={blockTypes}
        collections={collections}
        footer={
          can('collections:delete') && (
            <Card className="gap-3 py-4">
              <CardHeader className="px-4">
                <CardTitle className="text-sm">Delete collection</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 px-4 text-sm">
                {count > 0 ? (
                  <p className="text-muted-foreground">
                    This collection still has {count} {plural}. Move them to the trash before
                    deleting it.
                  </p>
                ) : (
                  <p className="text-muted-foreground">
                    Removes the collection and its field definitions for good.
                  </p>
                )}
                <ConfirmAction
                  href={urlFor('admin.collections.destroy', { id: collection.id })}
                  title={`Delete ${collection.name}?`}
                  description="The collection, its fields and any of its entries still in the trash are deleted permanently. This can't be undone."
                  confirmLabel="Delete collection"
                  trigger={
                    <Button variant="outline" size="sm" className="w-fit" disabled={count > 0}>
                      <Trash2 />
                      Delete
                    </Button>
                  }
                />
              </CardContent>
            </Card>
          )
        }
      />
    </>
  )
}
