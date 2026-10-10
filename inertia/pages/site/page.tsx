import type { InertiaProps } from '~/types'
import Blocks from '~/site/blocks'
import SeoHead from '~/site/seo_head'
import type { SitePageProps } from '~/site/types'

export default function SitePage({ blocks, seo, site }: InertiaProps<SitePageProps>) {
  return (
    <>
      <SeoHead seo={seo} site={site} />
      <Blocks blocks={blocks} />
    </>
  )
}
