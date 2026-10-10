export function formatDate(value: string | null | undefined) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

export function isInternal(href: string) {
  return href.startsWith('/') && !href.startsWith('//') && !href.startsWith('/admin')
}

export function kebab(value: string) {
  return value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase()
}

export function asText(value: unknown) {
  if (value === null || value === undefined) return ''
  return String(value)
}
