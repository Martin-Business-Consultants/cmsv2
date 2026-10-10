import { Head, router } from '@inertiajs/react'
import { Package } from 'lucide-react'
import type { InertiaProps } from '~/types'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '~/components/ui/tabs'
import PageHeader from '~/components/admin/page_header'
import EmptyState from '~/components/admin/empty_state'
import { useCan } from '~/hooks/use_can'
import { useState } from 'react'
import { cn } from '~/lib/utils'

type Plugin = {
  key: string
  name: string
  version: string
  description: string
  author: string | null
  homepage: string | null
  dependsOn: string[]
  switchedOn: boolean
  enabled: boolean
  missing: string[]
  contributions: string[]
}

type Props = InertiaProps<{ installed: Plugin[] }>

export default function PluginsIndex({ installed: plugins }: Props) {
  const can = useCan()
  const [view, setView] = useState('all')
  const active = plugins.filter((plugin) => plugin.switchedOn)
  const inactive = plugins.filter((plugin) => !plugin.switchedOn)
  const shown = view === 'active' ? active : view === 'inactive' ? inactive : plugins

  function toggle(plugin: Plugin) {
    router.put(
      `/admin/plugins/${plugin.key}`,
      { enabled: !plugin.switchedOn },
      { preserveScroll: true }
    )
  }

  return (
    <>
      <Head title="Plugins" />
      <PageHeader
        title="Plugins"
        description="Plugins add features to the CMS. Drop a plugin folder into plugins/ and restart to install it."
      />
      <Tabs value={view} onValueChange={setView} className="mb-4">
        <TabsList>
          <TabsTrigger value="all">All ({plugins.length})</TabsTrigger>
          <TabsTrigger value="active">Active ({active.length})</TabsTrigger>
          <TabsTrigger value="inactive">Inactive ({inactive.length})</TabsTrigger>
        </TabsList>
      </Tabs>
      {shown.length === 0 ? (
        <EmptyState icon={<Package className="size-8" />} title="No plugins here" />
      ) : (
        <div className="divide-y rounded-xl border">
          {shown.map((plugin) => (
            <div
              key={plugin.key}
              className={cn(
                'grid gap-3 p-4 sm:grid-cols-[14rem_1fr]',
                plugin.switchedOn && 'bg-muted/40 border-l-primary border-l-2'
              )}
            >
              <div className="grid content-start gap-1.5">
                <div className="font-semibold">{plugin.name}</div>
                {can('settings:write') && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={plugin.switchedOn ? 'outline' : 'default'}
                      onClick={() => toggle(plugin)}
                    >
                      {plugin.switchedOn ? 'Deactivate' : 'Activate'}
                    </Button>
                  </div>
                )}
              </div>
              <div className="grid gap-2 text-sm">
                <p>{plugin.description}</p>
                <p className="text-muted-foreground text-xs">
                  Version {plugin.version}
                  {plugin.author && <> · By {plugin.author}</>}
                  {plugin.homepage && (
                    <>
                      {' '}
                      ·{' '}
                      <a
                        className="underline"
                        href={plugin.homepage}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Visit plugin site
                      </a>
                    </>
                  )}
                  {plugin.dependsOn.length > 0 && <> · Requires {plugin.dependsOn.join(', ')}</>}
                </p>
                {plugin.switchedOn && !plugin.enabled && (
                  <p className="text-amber-600">
                    Waiting for {plugin.missing.join(', ')} to be active.
                  </p>
                )}
                {plugin.contributions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {plugin.contributions.map((item) => (
                      <Badge key={item} variant="secondary" className="font-normal">
                        {item}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
