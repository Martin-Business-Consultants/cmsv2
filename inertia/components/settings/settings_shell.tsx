import type { ReactNode } from 'react'
import { usePage } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import PageHeader from '~/components/admin/page_header'
import Postbox from '~/components/admin/postbox'
import { Button } from '~/components/ui/button'
import { cn } from '~/lib/utils'

function SettingsNav() {
  const { url, props } = usePage()
  const path = url.split(/[?#]/)[0]
  const item = (props.admin?.menu ?? [])
    .flatMap((group) => group.items)
    .find((entry) => entry.id === 'settings')
  const links = [
    { label: 'All settings', href: '/admin/settings' },
    ...(item?.submenu ?? []).filter((link) => link.href !== '/admin/settings'),
  ]

  return (
    <Postbox id="settings-sections" title="Settings" flush>
      <nav aria-label="Settings sections" className="grid gap-0.5 p-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              'hover:bg-accent hover:text-accent-foreground rounded-md px-2 py-1.5 text-sm',
              path === link.href ? 'bg-accent text-foreground font-medium' : 'text-muted-foreground'
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </Postbox>
  )
}

export default function SettingsShell({
  title,
  description,
  aside,
  wide,
  children,
}: {
  title: string
  description?: ReactNode
  aside?: ReactNode
  wide?: boolean
  children: ReactNode
}) {
  if (wide) {
    return (
      <>
        <PageHeader title={title} description={description} />
        {children}
      </>
    )
  }
  return (
    <>
      <PageHeader title={title} description={description} />
      <div className="grid items-start gap-6 lg:grid-cols-3">
        <div className="grid min-w-0 gap-6 lg:col-span-2">{children}</div>
        <aside className="grid gap-4 lg:sticky lg:top-16">
          {aside}
          <SettingsNav />
        </aside>
      </div>
    </>
  )
}

export function SaveBox({
  dirty,
  processing,
  label = 'Save changes',
  form,
  readOnly,
}: {
  dirty: boolean
  processing: boolean
  label?: string
  form: string
  readOnly?: boolean
}) {
  return (
    <Postbox id="settings-save" title="Save">
      {readOnly ? (
        <p className="text-muted-foreground text-sm">
          You can view these settings. Changing them needs the settings:write permission.
        </p>
      ) : (
        <>
          <p className="text-muted-foreground text-sm">
            {dirty ? 'You have unsaved changes.' : 'Everything is saved.'}
          </p>
          <Button type="submit" form={form} disabled={processing} className="w-full">
            {processing ? 'Saving…' : label}
          </Button>
        </>
      )}
    </Postbox>
  )
}
