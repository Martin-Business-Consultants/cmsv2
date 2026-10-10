import { Head } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { ChevronRight } from 'lucide-react'
import type { InertiaProps } from '~/types'
import PageHeader from '~/components/admin/page_header'
import { Badge } from '~/components/ui/badge'
import { Card, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'

type Props = InertiaProps<{
  version: string
  groups: { group: string; sections: { label: string; href: string; description: string }[] }[]
}>

export default function SettingsIndex({ version, groups }: Props) {
  return (
    <>
      <Head title="Settings" />
      <PageHeader
        title="Settings"
        description={
          <span className="inline-flex items-center gap-2">
            Everything about this workspace and your account.
            <Badge variant="secondary" className="font-mono">
              CMS {version}
            </Badge>
          </span>
        }
      />
      <div className="grid gap-8">
        {groups.map(({ group, sections }) => (
          <section key={group} className="grid gap-3">
            <h2 className="text-muted-foreground text-sm font-semibold">{group}</h2>
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {sections.map((section) => (
                <li key={section.href}>
                  <Link href={section.href} className="group block h-full">
                    <Card className="group-hover:border-foreground/20 group-hover:bg-accent/40 h-full gap-0 py-0 transition-colors">
                      <CardHeader className="gap-1 p-5">
                        <CardTitle className="flex items-center justify-between gap-2 text-sm">
                          {section.label}
                          <ChevronRight className="text-muted-foreground size-4 transition-transform group-hover:translate-x-0.5" />
                        </CardTitle>
                        {section.description && (
                          <CardDescription>{section.description}</CardDescription>
                        )}
                      </CardHeader>
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  )
}
