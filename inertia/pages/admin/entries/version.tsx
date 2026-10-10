import { Head } from '@inertiajs/react'
import type { Data } from '@generated/data'
import type { ContentDiffResult } from '#services/content_diff'
import type { InertiaProps } from '~/types'
import PageHeader from '~/components/admin/page_header'
import { VersionDetail } from '~/components/admin/versions_screen'
import { useCan } from '~/hooks/use_can'
import { formatDateTime } from '~/lib/format'
import { urlFor } from '~/client'

type Props = InertiaProps<{
  collection: Data.Collection
  entry: Data.Entry.Variants['forList']
  version: Data.EntryVersion
  diff: ContentDiffResult
  blockLabels: Record<string, string>
}>

export default function EntryVersion({ collection, entry, version, diff, blockLabels }: Props) {
  const can = useCan()
  const params = { collectionId: collection.id, id: entry.id }
  const canRestore =
    can('entries:write') && (entry.status !== 'published' || can('entries:publish'))

  return (
    <>
      <Head title={`Version · ${entry.title}`} />
      <PageHeader
        title={`Version from ${formatDateTime(version.createdAt)}`}
        description={`What restoring it would change on “${entry.title}”.`}
        back={{ href: urlFor('admin.entry_versions.index', params), label: 'Versions' }}
      />
      <VersionDetail
        version={version}
        diff={diff}
        blockLabels={blockLabels}
        restoreHref={
          canRestore
            ? urlFor('admin.entry_versions.restore', { ...params, versionId: version.id })
            : null
        }
        restoreDescription="The title, fields and SEO go back to how they were. Your current content is kept as a version too."
      />
    </>
  )
}
