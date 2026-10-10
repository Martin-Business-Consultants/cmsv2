function xsrfToken() {
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : ''
}

export async function getJson<T>(url: string, params: Record<string, unknown> = {}): Promise<T> {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    query.set(key, Array.isArray(value) ? value.join(',') : String(value))
  }
  const response = await fetch(query.size ? `${url}?${query}` : url, {
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) throw new Error(`Request failed: ${response.status}`)
  return response.json()
}

export async function postForm<T>(url: string, body: FormData): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    body,
    headers: { 'Accept': 'application/json', 'X-XSRF-TOKEN': xsrfToken() },
  })
  if (!response.ok) throw new Error(`Upload failed: ${response.status}`)
  return response.json()
}
