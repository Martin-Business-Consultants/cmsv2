const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
]

export function timeAgo(value: string) {
  const seconds = (new Date(value).getTime() - Date.now()) / 1000
  const format = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return format.format(Math.round(seconds / size), unit)
  }
  return 'just now'
}

export default function TimeAgo({ value }: { value: string }) {
  return (
    <time dateTime={value} title={new Date(value).toLocaleString()} suppressHydrationWarning>
      {timeAgo(value)}
    </time>
  )
}
