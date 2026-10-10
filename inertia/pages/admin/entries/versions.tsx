import { Head } from '@inertiajs/react'
import type { Data } from '@generated/data'
import type { InertiaProps } from '~/types'
import PageHeader from '~/components/admin/page_header'
import type { ListMeta } from '~/components/admin/list'
import { VersionsTable } from '~/components/admin/versions_screen'
import { useCan } from '~/hooks/use_can'
import { urlFor } from '~/client'

type Props = InertiaProps<{
  collection: Data.Collection
  entry: Data.Entry.Variants['forList']
  versions: Data.EntryVersion[]
  differs: Record<string, string[]>
  meta: ListMeta
}>

export default function EntryVersions({ collection, entry, versions, differs, meta }: Props) {
  const can = useCan()
  const params = { collectionId: collection.id, id: entry.id }
  const canRestore =
    can('entries:write') && (entry.status !== 'published' || can('entries:publish'))

  return (
    <>
      <Head title={`Versions · ${entry.title}`} />
      <PageHeader
        title="Versions"
        description={`Every save of “${entry.title}”, newest first.`}
        back={{ href: urlFor('admin.entries.edit', params), label: entry.title }}
      />
      <VersionsTable
        versions={versions}
        differs={differs}
        meta={meta}
        showHref={(version) =>
          urlFor('admin.entry_versions.show', { ...params, versionId: version.id })
        }
        restore={
          canRestore
            ? {
                href: (version) =>
                  urlFor('admin.entry_versions.restore', { ...params, versionId: version.id }),
                description:
                  'The title, fields and SEO go back to how they were. Your current content is kept as a version too.',
              }
            : null
        }
      />
    </>
  )
}
