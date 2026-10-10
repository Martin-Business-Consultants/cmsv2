import { Badge } from '~/components/ui/badge'

export default function StatusBadge({
  status,
  live,
  scheduled,
}: {
  status: string
  live?: boolean
  scheduled?: boolean
}) {
  if (scheduled && status !== 'published') return <Badge variant="outline">Scheduled</Badge>
  if (status === 'published' && live === false) {
    return <Badge variant="outline">Scheduled</Badge>
  }
  if (status === 'published' || (status !== 'archived' && live)) {
    return <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Published</Badge>
  }
  if (status === 'archived') {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        Archived
      </Badge>
    )
  }
  return <Badge variant="secondary">Draft</Badge>
}
