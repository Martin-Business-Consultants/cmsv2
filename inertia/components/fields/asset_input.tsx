import { createElement } from 'react'
import type { AssetOption } from '#types/content'
import { Input } from '~/components/ui/input'
import { useSlot } from '~/hooks/use_slot'

export type AssetPickerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPick: (asset: AssetOption) => void
}

export function AssetPickerDialog(props: AssetPickerProps) {
  const picker = useSlot('asset_picker')
  return picker ? createElement(picker, props) : null
}

export function useHasMediaLibrary() {
  return Boolean(useSlot('asset_picker'))
}

export default function AssetInput({
  value,
  onChange,
}: {
  value: number | null
  onChange: (value: number | null) => void
}) {
  const slot = useSlot('asset_input')
  if (slot) return createElement(slot, { value, onChange })
  return (
    <Input
      type="number"
      placeholder="File ID"
      value={value ?? ''}
      onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)}
    />
  )
}
