import type { ComponentType } from 'react'
import { usePage } from '@inertiajs/react'
import type { RenderBlock } from '#types/site'
import type { SiteShared } from '~/site/types'
import CollectionList from '~/site/blocks/collection_list'
import ContactInfo from '~/site/blocks/contact_info'
import CtaBand from '~/site/blocks/cta_band'
import Divider from '~/site/blocks/divider'
import FeatureGrid from '~/site/blocks/feature_grid'
import Gallery from '~/site/blocks/gallery'
import Hero from '~/site/blocks/hero'
import MediaText from '~/site/blocks/media_text'
import Quote from '~/site/blocks/quote'
import StatsSection from '~/site/blocks/stats_section'
import Text from '~/site/blocks/text'
import { Container } from '~/site/section'
import { pluginBlocks } from '~/lib/plugin_components'

type BlockComponent = ComponentType<{ block: RenderBlock; data: Record<string, any> }>

export const blockComponents: Record<string, BlockComponent> = {
  hero: Hero,
  media_text: MediaText,
  feature_grid: FeatureGrid,
  stats_section: StatsSection,
  cta_band: CtaBand,
  collection_list: CollectionList,
  text: Text,
  quote: Quote,
  gallery: Gallery,
  divider: Divider,
  contact_info: ContactInfo,
  ...pluginBlocks,
}

function Unknown({ block }: { block: RenderBlock }) {
  return (
    <Container className="py-6">
      <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
        No theme component for the <code className="font-mono text-foreground">{block.type}</code>{' '}
        block yet.
      </div>
    </Container>
  )
}

export default function Blocks({ blocks }: { blocks: RenderBlock[] | null | undefined }) {
  const { preview } = usePage<SiteShared>().props
  return (
    <>
      {(blocks ?? []).map((block) => {
        const Component = blockComponents[block.type]
        if (!Component) return preview ? <Unknown key={block.id} block={block} /> : null
        return <Component key={block.id} block={block} data={block.data ?? {}} />
      })}
    </>
  )
}
