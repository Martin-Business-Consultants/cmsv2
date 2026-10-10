import { useCallback, useState } from 'react'

export type RowKey = string | number

export type Selection<K extends RowKey = RowKey> = {
  ids: K[]
  count: number
  isSelected: (key: K) => boolean
  toggle: (key: K) => void
  toggleAll: () => void
  clear: () => void
  allState: boolean | 'indeterminate'
}

export function useSelection<K extends RowKey>(keys: K[]): Selection<K> {
  const [picked, setPicked] = useState<K[]>([])
  const ids = picked.filter((key) => keys.includes(key))

  const toggle = useCallback(
    (key: K) =>
      setPicked((current) =>
        current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
      ),
    []
  )
  const clear = useCallback(() => setPicked([]), [])
  const allState: boolean | 'indeterminate' =
    ids.length === 0 ? false : ids.length === keys.length ? true : 'indeterminate'

  return {
    ids,
    count: ids.length,
    isSelected: (key) => ids.includes(key),
    toggle,
    toggleAll: () => setPicked(allState === true ? [] : [...keys]),
    clear,
    allState,
  }
}
