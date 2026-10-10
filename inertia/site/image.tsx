import type { ResolvedAsset } from '#types/site'
import { cn } from '~/lib/utils'

export default function SiteImage({
  asset,
  sizes = '100vw',
  className,
  eager = false,
}: {
  asset: ResolvedAsset | null | undefined
  sizes?: string
  className?: string
  eager?: boolean
}) {
  if (!asset?.url) return null
  return (
    <img
      src={asset.url}
      srcSet={asset.srcset || undefined}
      sizes={asset.srcset ? sizes : undefined}
      width={asset.width ?? undefined}
      height={asset.height ?? undefined}
      alt={asset.alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      className={cn('block h-auto max-w-full', className)}
      style={
        asset.focalPoint
          ? { objectPosition: `${asset.focalPoint.x * 100}% ${asset.focalPoint.y * 100}%` }
          : undefined
      }
    />
  )
}
