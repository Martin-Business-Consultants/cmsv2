import { Link } from '@adonisjs/inertia/react'
import { ImageOff } from 'lucide-react'
import type { ResolvedAsset } from '#types/site'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { formatBytes } from '~/lib/format'
import { urlFor } from '~/client'

export default function LibraryWidget({
  title,
  files,
  bytes,
  missingAlt,
  missingAltInUse,
  recent,
}: {
  title: string
  files: number
  bytes: number
  missingAlt: number
  missingAltInUse: number
  recent: ResolvedAsset[]
}) {
  return (
    <Card data-testid="media-widget">
      <CardHeader>
        <CardTitle className="flex items-baseline justify-between gap-2">
          {title}
          <Link
            href={urlFor('admin.media.index')}
            className="text-muted-foreground text-sm font-normal hover:underline"
          >
            {files} {files === 1 ? 'file' : 'files'} · {formatBytes(bytes)}
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {recent.length > 0 ? (
          <div className="grid grid-cols-6 gap-1.5">
            {recent.map((asset) => (
              <Link
                key={asset.id}
                href={`${urlFor('admin.media.index')}?selected=${asset.id}`}
                className="bg-muted aspect-square overflow-hidden rounded-md"
              >
                <img
                  src={asset.url}
                  srcSet={asset.srcset || undefined}
                  sizes="80px"
                  alt={asset.alt}
                  className="size-full object-cover"
                />
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">No images uploaded yet.</p>
        )}
        {missingAlt > 0 && (
          <Link
            href={`${urlFor('admin.media.index')}?missingAlt=1`}
            className="flex items-center gap-2 text-sm text-amber-700 hover:underline dark:text-amber-500"
          >
            <ImageOff className="size-4" />
            {missingAlt} {missingAlt === 1 ? 'image has' : 'images have'} no alt text
            {missingAltInUse > 0 && ` (${missingAltInUse} in use)`}
          </Link>
        )}
      </CardContent>
    </Card>
  )
}
