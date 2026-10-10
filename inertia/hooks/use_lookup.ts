import { useEffect, useState } from 'react'
import { getJson } from '~/lib/http'

export function useLookup<T>(url: string | null, params: Record<string, unknown>, delay = 200) {
  const query = JSON.stringify(params)
  const key = url ? `${url}?${query}` : null
  const [result, setResult] = useState<{ key: string; data: T[] } | null>(null)

  useEffect(() => {
    if (!url) return
    const requestKey = `${url}?${query}`
    let cancelled = false
    const timer = setTimeout(() => {
      getJson<{ data: T[] }>(url, JSON.parse(query))
        .then((response) => !cancelled && setResult({ key: requestKey, data: response.data }))
        .catch(
          () =>
            !cancelled && setResult((previous) => ({ key: requestKey, data: previous?.data ?? [] }))
        )
    }, delay)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [url, query, delay])

  return { data: result?.data ?? [], loading: key !== null && result?.key !== key }
}
