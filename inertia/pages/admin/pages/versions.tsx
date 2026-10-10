import { Head } from '@inertiajs/react'
import type { Data } from '@generated/data'
import type { InertiaProps } from '~/types'
import PageHeader from '~/components/admin/page_header'
import type { ListMeta } from '~/components/admin/list'
import { VersionsTable } from '~/components/admin/versions_screen'
import { useCan } from '~/hooks/use_can'
import { urlFor } from '~/client'

type Props = InertiaProps<{
  page: Data.Page.Variants['forList']
  versions: Data.PageVersion[]
  differs: Record<string, string[]>
  meta: ListMeta
}>

export default function PageVersions({ page, versions, differs, meta }: Props) {
  const can = useCan()
  const canRestore = can('pages:write') && (page.status !== 'published' || can('pages:publish'))

  return (
    <>
      <Head title={`Versions · ${page.title}`} />
      <PageHeader
        title="Versions"
        description={`Every save of “${page.title}”, newest first.`}
        back={{ href: urlFor('admin.pages.edit', { id: page.id }), label: page.title }}
      />
      <VersionsTable
        versions={versions}
        differs={differs}
        meta={meta}
        showHref={(version) =>
          urlFor('admin.page_versions.show', { id: page.id, versionId: version.id })
        }
        restore={
          canRestore
            ? {
                href: (version) =>
                  urlFor('admin.page_versions.restore', { id: page.id, versionId: version.id }),
                description:
                  "The page's title, content and SEO go back to how they were. Your current content is kept as a version too.",
              }
            : null
        }
      />
    </>
  )
}
