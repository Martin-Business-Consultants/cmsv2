let siteTimeZone: string | undefined

export function setTimeZone(timeZone: string | null | undefined) {
  siteTimeZone = timeZone || undefined
}

export function getTimeZone() {
  return siteTimeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
}

function zoned(options: Intl.DateTimeFormatOptions): Intl.DateTimeFormatOptions {
  if (!siteTimeZone) return options
  try {
    new Intl.DateTimeFormat(undefined, { timeZone: siteTimeZone })
    return { ...options, timeZone: siteTimeZone }
  } catch {
    return options
  }
}

export function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString(
    undefined,
    zoned({ year: 'numeric', month: 'short', day: 'numeric' })
  )
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return '—'
  return new Date(value).toLocaleString(
    undefined,
    zoned({ year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  )
}

export function formatTime(value: string | null | undefined) {
  if (!value) return '—'
  return new Date(value).toLocaleTimeString(
    undefined,
    zoned({ hour: 'numeric', minute: '2-digit' })
  )
}

function zonedParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    ...zoned({}),
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date)
  const part = (type: string) => Number(parts.find((item) => item.type === type)?.value ?? 0)
  return {
    year: part('year'),
    month: part('month'),
    day: part('day'),
    hour: part('hour') % 24,
    minute: part('minute'),
    second: part('second'),
  }
}

export function toZonedInput(iso: string | null | undefined) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const p = zonedParts(date)
  const pad = (value: number, size = 2) => String(value).padStart(size, '0')
  return `${pad(p.year, 4)}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}:${pad(p.second)}`
}

export function fromZonedInput(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/)
  if (!match) return null
  const [year, month, day, hour, minute, second] = match.slice(1).map((item) => Number(item ?? 0))
  const wanted = Date.UTC(year, month - 1, day, hour, minute, second)
  let guess = wanted
  for (let attempt = 0; attempt < 3; attempt++) {
    const p = zonedParts(new Date(guess))
    const shown = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
    if (shown === wanted) break
    guess += wanted - shown
  }
  return new Date(guess).toISOString()
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function snakeify(value: string) {
  return slugify(value).replace(/-/g, '_')
}

export function newId() {
  return Math.random().toString(36).slice(2, 10)
}
