import type { RenderBlock } from '#types/site'
import { cn } from '~/lib/utils'
import { Container } from '~/site/section'

export default function Divider({ data }: { block: RenderBlock; data: Record<string, any> }) {
  return (
    <Container className="py-4">
      <hr
        className={cn(
          'border-t border-border',
          data.style === 'dashed' && 'border-dashed',
          data.style === 'dotted' && 'border-dotted border-t-2'
        )}
      />
    </Container>
  )
}
