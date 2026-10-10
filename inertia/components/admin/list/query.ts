import { router, usePage } from '@inertiajs/react'

export type QueryChanges = Record<string, string | number | null | undefined>

export type ListMeta = {
  total: number
  perPage: number
  currentPage: number
  lastPage: number
  firstRow: number
  lastRow: number
}

export type SortState = { sort: string; order: 'asc' | 'desc' }

export function hrefWith(url: string, changes: QueryChanges, resetPage = true) {
  const [path, search = ''] = url.split('?')
  const params = new URLSearchParams(search)
  if (resetPage) params.delete('page')
  for (const [key, value] of Object.entries(changes)) {
    if (value === '' || value === null || value === undefined || (key === 'page' && value === 1)) {
      params.delete(key)
    } else {
      params.set(key, String(value))
    }
  }
  const query = params.toString()
  return query ? `${path}?${query}` : path
}

export function useListUrl() {
  const { url } = usePage()
  return {
    url,
    href: (changes: QueryChanges, resetPage = true) => hrefWith(url, changes, resetPage),
    visit: (changes: QueryChanges, resetPage = true) =>
      router.get(hrefWith(url, changes, resetPage), undefined, {
        preserveState: true,
        preserveScroll: true,
        replace: true,
      }),
  }
}
