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
  page: Data.Page.Variants['forList']
  version: Data.PageVersion
  diff: ContentDiffResult
  blockLabels: Record<string, string>
}>

export default function PageVersion({ page, version, diff, blockLabels }: Props) {
  const can = useCan()
  const canRestore = can('pages:write') && (page.status !== 'published' || can('pages:publish'))
  const params = { id: page.id, versionId: version.id }

  return (
    <>
      <Head title={`Version · ${page.title}`} />
      <PageHeader
        title={`Version from ${formatDateTime(version.createdAt)}`}
        description={`What restoring it would change on “${page.title}”.`}
        back={{ href: urlFor('admin.page_versions.index', { id: page.id }), label: 'Versions' }}
      />
      <VersionDetail
        version={version}
        diff={diff}
        blockLabels={blockLabels}
        restoreHref={canRestore ? urlFor('admin.page_versions.restore', params) : null}
        restoreDescription="The page's title, content and SEO go back to how they were. Your current content is kept as a version too."
      />
    </>
  )
}
