import { FileArchive, FileAudio, FileIcon, FileText, FileVideo } from 'lucide-react'
import { cn } from '~/lib/utils'

type Thumbable = {
  url: string
  isImage: boolean
  alt?: string | null
  srcset?: string | null
  mimeType?: string
  filename: string
  focalX?: number
  focalY?: number
}

function FileGlyph({ mimeType, className }: { mimeType: string; className?: string }) {
  if (mimeType.startsWith('video/')) return <FileVideo className={className} />
  if (mimeType.startsWith('audio/')) return <FileAudio className={className} />
  if (mimeType === 'application/zip') return <FileArchive className={className} />
  if (mimeType.startsWith('text/') || mimeType.includes('pdf') || mimeType.includes('document')) {
    return <FileText className={className} />
  }
  return <FileIcon className={className} />
}

export default function AssetThumb({
  asset,
  sizes = '200px',
  className,
  iconClassName = 'size-8',
}: {
  asset: Thumbable
  sizes?: string
  className?: string
  iconClassName?: string
}) {
  if (asset.isImage) {
    return (
      <img
        src={asset.url}
        srcSet={asset.srcset || undefined}
        sizes={asset.srcset ? sizes : undefined}
        alt={asset.alt ?? ''}
        loading="lazy"
        draggable={false}
        className={cn('bg-muted size-full object-cover', className)}
        style={{
          objectPosition: `${(asset.focalX ?? 0.5) * 100}% ${(asset.focalY ?? 0.5) * 100}%`,
        }}
      />
    )
  }
  const ext = asset.filename.includes('.') ? asset.filename.split('.').pop() : null
  return (
    <div
      className={cn(
        'bg-muted text-muted-foreground flex size-full flex-col items-center justify-center gap-1.5',
        className
      )}
    >
      <FileGlyph mimeType={asset.mimeType ?? ''} className={iconClassName} />
      {ext && <span className="text-[10px] font-medium uppercase">{ext}</span>}
    </div>
  )
}
