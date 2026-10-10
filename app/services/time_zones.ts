function offsetOf(zone: string, at: Date) {
  const part = new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'longOffset' })
    .formatToParts(at)
    .find((item) => item.type === 'timeZoneName')
  const value = part?.value.replace('GMT', '') || '+00:00'
  return value
}

function minutes(offset: string) {
  const match = offset.match(/^([+-])(\d{2}):(\d{2})$/)
  if (!match) return 0
  return (match[1] === '-' ? -1 : 1) * (Number(match[2]) * 60 + Number(match[3]))
}

let cache: { value: string; label: string; offset: number }[] | null = null

export function timeZoneOptions(current?: string | null) {
  if (!cache) {
    const now = new Date()
    cache = Intl.supportedValuesOf('timeZone')
      .map((zone) => {
        const offset = offsetOf(zone, now)
        return {
          value: zone,
          label: `(GMT${offset}) ${zone.replace(/_/g, ' ')}`,
          offset: minutes(offset),
        }
      })
      .sort((a, b) => a.offset - b.offset || a.value.localeCompare(b.value))
  }
  const options = cache.map(({ value, label }) => ({ value, label }))
  if (current && !options.some((option) => option.value === current)) {
    options.push({ value: current, label: current })
  }
  return options
}
