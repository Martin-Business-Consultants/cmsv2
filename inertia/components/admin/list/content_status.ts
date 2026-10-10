import type { StatusOption } from './status_links'

const LABELS: [string, string][] = [
  ['published', 'Published'],
  ['draft', 'Drafts'],
  ['archived', 'Archived'],
]

export function contentStatusLinks(
  counts: Record<string, number>,
  trashHref: string | null
): StatusOption[] {
  const options: StatusOption[] = [{ label: 'All', value: '', count: counts.all ?? 0 }]
  for (const [value, label] of LABELS) {
    if (value in counts) {
      options.push({ label, value, count: counts[value], hideWhenEmpty: value === 'archived' })
    }
  }
  if (trashHref && counts.trash) {
    options.push({ label: 'Trash', value: '__trash', count: counts.trash, href: trashHref })
  }
  return options
}
