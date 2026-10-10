import type { ReactNode } from 'react'
import { Link } from '@adonisjs/inertia/react'
import { SearchX } from 'lucide-react'
import { Button } from '~/components/ui/button'
import EmptyState from '~/components/admin/empty_state'

export default function ListEmpty({
  filtered,
  resetHref,
  icon,
  title,
  description,
  action,
}: {
  filtered: boolean
  resetHref: string
  icon: ReactNode
  title: string
  description?: string
  action?: ReactNode
}) {
  if (filtered) {
    return (
      <EmptyState
        icon={<SearchX className="size-8" />}
        title="Nothing matches"
        description="Try a different search or filter."
        action={
          <Button asChild variant="outline" size="sm">
            <Link href={resetHref}>Show all</Link>
          </Button>
        }
      />
    )
  }
  return <EmptyState icon={icon} title={title} description={description} action={action} />
}
