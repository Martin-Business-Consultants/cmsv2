import { useEffect, useState } from 'react'
import { ImageIcon, X } from 'lucide-react'
import type { AssetOption } from '#types/content'
import { Button } from '~/components/ui/button'
import { getJson } from '~/lib/http'
import { urlFor } from '~/client'
import AssetThumb from '../components/asset_thumb'
import AssetPicker from './asset_picker'

export default function AssetInput({
  value,
  onChange,
}: {
  value: number | null
  onChange: (value: number | null) => void
}) {
  const [open, setOpen] = useState(false)
  const [fetched, setFetched] = useState<{ id: number; asset: AssetOption | null } | null>(null)
  const asset = value && fetched?.id === value ? fetched.asset : null
  const missing = value && fetched?.id !== value ? value : null

  useEffect(() => {
    if (!missing) return
    let cancelled = false
    getJson<{ data: AssetOption[] }>(urlFor('admin.media.lookup'), { ids: missing })
      .then((response) => {
        if (!cancelled) setFetched({ id: missing, asset: response.data[0] ?? null })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [missing])

  const gone = Boolean(value && fetched?.id === value && !fetched.asset)

  return (
    <div className="flex items-center gap-3" data-testid="asset-input">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-muted hover:ring-ring flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border hover:ring-2"
        aria-label={asset ? `Change ${asset.filename}` : 'Choose a file'}
      >
        {asset ? (
          <AssetThumb asset={asset} sizes="80px" iconClassName="size-6" />
        ) : (
          <ImageIcon className="text-muted-foreground size-6" />
        )}
      </button>
      <div className="flex min-w-0 flex-col gap-1">
        <span className="truncate text-sm">
          {asset?.filename ??
            (gone
              ? `File #${value} is missing or in the trash`
              : value
                ? 'Loading…'
                : 'No file chosen')}
        </span>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
            {value ? 'Replace' : 'Choose'}
          </Button>
          {value && (
            <Button type="button" size="sm" variant="ghost" onClick={() => onChange(null)}>
              <X />
              Remove
            </Button>
          )}
        </div>
      </div>
      <AssetPicker
        open={open}
        onOpenChange={setOpen}
        onPick={(picked) => {
          setFetched({ id: picked.id, asset: picked })
          onChange(picked.id)
          setOpen(false)
        }}
      />
    </div>
  )
}
