import { Head } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { Trash2 } from 'lucide-react'
import type { Data } from '@generated/data'
import type { CollectionOption } from '#types/content'
import type { InertiaProps } from '~/types'
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '~/components/ui/alert_dialog'
import PageHeader from '~/components/admin/page_header'
import ConfirmAction from '~/components/admin/confirm_action'
import BlockTypeForm from '~/components/admin/block_type_form'
import { useCan } from '~/hooks/use_can'
import { urlFor } from '~/client'

type Usage = { kind: 'page' | 'entry' | 'global'; label: string; href: string; trashed: boolean }

type Props = InertiaProps<{
  blockType: Data.BlockType
  blockTypes: Data.BlockType[]
  collections: CollectionOption[]
  categories: string[]
  usage: Usage[]
}>

const KIND_LABELS = { page: 'Page', entry: 'Entry', global: 'Global' }

export default function BlockTypesEdit({
  blockType,
  blockTypes,
  collections,
  categories,
  usage,
}: Props) {
  const can = useCan()
  const deleteButton = (
    <Button type="button" variant="outline" size="sm" className="text-destructive w-fit">
      <Trash2 />
      Delete block type
    </Button>
  )

  return (
    <>
      <Head title={blockType.label} />
      <PageHeader
        title={blockType.label}
        description={
          <span className="inline-flex items-center gap-2">
            <span className="font-mono">{blockType.slug}</span>
            {blockType.deprecated && <Badge variant="secondary">Deprecated</Badge>}
            <Badge variant="outline">{blockType.builtIn ? 'Built-in' : 'Custom'}</Badge>
          </span>
        }
        back={{ href: urlFor('admin.block_types.index'), label: 'Block types' }}
      />
      <BlockTypeForm
        key={blockType.updatedAt}
        initial={{
          label: blockType.label,
          slug: blockType.slug,
          category: blockType.category ?? '',
          description: blockType.description ?? '',
          icon: blockType.icon ?? '',
          fields: blockType.fields ?? [],
          defaults: blockType.defaults ?? {},
          deprecated: Boolean(blockType.deprecated),
          version: Number(blockType.version) || 1,
        }}
        builtIn={Boolean(blockType.builtIn)}
        action={urlFor('admin.block_types.update', { id: blockType.id })}
        method="put"
        submitLabel="Save"
        blockTypes={blockTypes}
        collections={collections}
        categories={categories}
        sidebar={
          <Card className="gap-3 py-4">
            <CardHeader className="px-4">
              <CardTitle className="text-sm">Where it’s used</CardTitle>
              <CardDescription className="text-xs">
                {usage.length === 0
                  ? 'Not used anywhere yet.'
                  : `In ${usage.length} ${usage.length === 1 ? 'place' : 'places'}.`}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 px-4">
              {usage.length > 0 && (
                <ul className="grid max-h-64 gap-1.5 overflow-y-auto text-sm">
                  {usage.map((item) => (
                    <li key={`${item.kind}-${item.href}`} className="flex items-center gap-2">
                      <Badge variant="outline" className="shrink-0">
                        {KIND_LABELS[item.kind]}
                      </Badge>
                      <Link href={item.href} className="truncate hover:underline">
                        {item.label}
                      </Link>
                      {item.trashed && (
                        <span className="text-muted-foreground shrink-0 text-xs">in trash</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {can('block_types:delete') &&
                (usage.length > 0 ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>{deleteButton}</AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{blockType.label} is still in use</AlertDialogTitle>
                        <AlertDialogDescription>
                          It’s used in {usage.length} {usage.length === 1 ? 'place' : 'places'}{' '}
                          (listed under “Where it’s used”). Remove those blocks first, then delete
                          the block type.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>OK</AlertDialogCancel>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : (
                  <ConfirmAction
                    href={urlFor('admin.block_types.destroy', { id: blockType.id })}
                    title={`Delete ${blockType.label}?`}
                    description="Editors won’t be able to add this block any more. This can’t be undone."
                    confirmLabel="Delete block type"
                    trigger={deleteButton}
                  />
                ))}
            </CardContent>
          </Card>
        }
      />
    </>
  )
}
