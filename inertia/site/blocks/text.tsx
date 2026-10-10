import type { RenderBlock } from '#types/site'
import Markdown from '~/site/markdown'
import { Container } from '~/site/section'

export default function Text({ data }: { block: RenderBlock; data: Record<string, any> }) {
  return (
    <section className="py-12 sm:py-16">
      <Container className="max-w-3xl">
        <Markdown source={data.body} />
      </Container>
    </section>
  )
}
