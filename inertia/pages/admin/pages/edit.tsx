import { useState } from 'react'
import { Head } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { ListPlus, Plus } from 'lucide-react'
import type { Data } from '@generated/data'
import type { CollectionOption, Field, FieldData, Status } from '#types/content'
import type { InertiaProps } from '~/types'
import { Button } from '~/components/ui/button'
import PageHeader from '~/components/admin/page_header'
import PageEditor from '~/components/admin/page_editor'
import type { ApiPreview } from '~/components/admin/api_json_panel'
import { useCan } from '~/hooks/use_can'
import { urlFor } from '~/client'
import type { TaxonomyEditor } from '~/components/admin/taxonomy_postbox'
import type { SiteLocales, TranslationLink } from '~/components/admin/translations_postbox'
import { recordMetaInitial } from '~/components/admin/record_meta'

type Props = InertiaProps<{
  page: Data.Page
  blockTypes: Data.BlockType[]
  collections: CollectionOption[]
  parents: { id: number; title: string; path: string }[]
  versionsCount: number
  apiPreview?: ApiPreview
  taxonomy: TaxonomyEditor
  locales: SiteLocales
  translations: TranslationLink[]
}>

export default function PagesEdit({
  page,
  blockTypes,
  collections,
  parents,
  versionsCount,
  apiPreview,
  taxonomy,
  locales,
  translations,
}: Props) {
  const can = useCan()
  const [revision, setRevision] = useState(0)
  const params = { id: page.id }
  const meta = {
    taxonomy,
    locales,
    translations,
    addTranslationHref: urlFor('admin.translations.page', params),
    translationHref: (id: number) => urlFor('admin.pages.edit', { id }),
  }

  return (
    <>
      <Head title={page.title} />
      <PageHeader
        title="Edit Page"
        back={{ href: urlFor('admin.pages.index'), label: 'Pages' }}
        actions={
          can('pages:write') && (
            <>
              <Button asChild variant="outline" size="sm">
                <Link route="admin.page_fields.show" routeParams={params}>
                  <ListPlus />
                  Fields
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link route="admin.pages.create">
                  <Plus />
                  Add New
                </Link>
              </Button>
            </>
          )
        }
      />
      <PageEditor
        key={`${page.id}-${revision}`}
        initial={{
          title: page.title,
          slug: page.slug,
          parentId: page.parentId,
          blocks: page.blocks,
          frontmatter: (page.frontmatter as FieldData | null) ?? {},
          seo: page.seo ?? {},
          status: page.status as Status,
          publishAt: page.publishAt,
          unpublishAt: page.unpublishAt,
          lockVersion: page.lockVersion,
          ...recordMetaInitial(meta, page.locale),
        }}
        action={urlFor('admin.pages.update', params)}
        method="put"
        backHref={urlFor('admin.pages.index')}
        blockTypes={blockTypes}
        collections={collections}
        parents={parents}
        fields={(page.fields as Field[] | null) ?? []}
        onSaved={() => setRevision((value) => value + 1)}
        meta={meta}
        record={{
          target: {
            noun: 'page',
            savedStatus: page.status as Status,
            publishedAt: page.publishedAt,
            versionsCount,
            versionsHref: urlFor('admin.page_versions.index', params),
            previewHref: urlFor('admin.previews.page', params),
            trashHref: urlFor('admin.pages.destroy', params),
            canDelete: can('pages:delete'),
          },
          reference: `/${page.path}`,
          publicPath: page.publicPath,
          isLive: page.isLive,
          updatedAt: page.updatedAt,
          editHref: urlFor('admin.pages.edit', params),
          fieldsHref: can('pages:write') ? urlFor('admin.page_fields.show', params) : undefined,
          apiPreview,
        }}
      />
    </>
  )
}
