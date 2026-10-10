import { useEffect, useState, type ReactNode } from 'react'
import { router, usePage } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { toast } from 'sonner'
import { ChevronRight, ExternalLink, LayoutDashboard, LogOut, Plus, UserRound } from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '~/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown_menu'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '~/components/ui/collapsible'
import { Avatar, AvatarFallback } from '~/components/ui/avatar'
import { Button } from '~/components/ui/button'
import { Toaster } from '~/components/ui/sonner'
import Icon from '~/components/admin/dynamic_icon'
import KeyboardShortcuts from '~/components/admin/keyboard_shortcuts'
import ThemeToggle, { useAppearance } from '~/components/admin/theme_toggle'
import { setTimeZone } from '~/lib/format'
import { cn } from '~/lib/utils'

type MenuLink = { label: string; href: string; icon?: string | null }
type MenuItem = { id: string; label: string; icon: string; href: string; submenu: MenuLink[] }

function matchLength(path: string, href: string) {
  const target = href.split('?')[0]
  if (path === target) return target.length + 1
  if (target !== '/admin' && path.startsWith(`${target}/`)) return target.length
  return 0
}

function bestMatch<T>(path: string, entries: T[], hrefs: (entry: T) => string[]) {
  let best: T | null = null
  let score = 0
  for (const entry of entries) {
    const length = Math.max(0, ...hrefs(entry).map((href) => matchLength(path, href)))
    if (length > score) {
      best = entry
      score = length
    }
  }
  return best
}

function MenuEntry({ item, current, path }: { item: MenuItem; current: boolean; path: string }) {
  const { state, isMobile } = useSidebar()
  const [open, setOpen] = useState(current)
  const activeLink = current ? bestMatch(path, item.submenu, (link) => [link.href]) : null
  const expanded = open || current

  if (!item.submenu.length || (state === 'collapsed' && !isMobile)) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton asChild isActive={current} tooltip={item.label}>
          <Link href={item.href}>
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    )
  }

  return (
    <Collapsible asChild open={expanded} onOpenChange={setOpen}>
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton isActive={current} tooltip={item.label}>
            <Icon name={item.icon} />
            <span>{item.label}</span>
            <ChevronRight className={cn('ml-auto transition-transform', expanded && 'rotate-90')} />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {item.submenu.map((link) => (
              <SidebarMenuSubItem key={link.href + link.label}>
                <SidebarMenuSubButton asChild isActive={activeLink === link}>
                  <Link href={link.href}>
                    {link.icon && <Icon name={link.icon} />}
                    <span>{link.label}</span>
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  )
}

function AdminMenu() {
  const { url, props } = usePage()
  const path = url.split('?')[0]
  const groups = props.admin?.menu ?? []
  const items = groups.flatMap((group) => group.items)
  const current =
    path === '/admin'
      ? null
      : bestMatch(path, items, (item) => [item.href, ...item.submenu.map((link) => link.href)])

  const { brand } = props
  const { state, isMobile } = useSidebar()
  const folded = state === 'collapsed' && !isMobile

  return (
    <SidebarContent className="pt-2">
      {brand?.logoSmallUrl && !folded && (
        <div className="px-4 pt-2 pb-1">
          <img
            src={brand.logoSmallUrl}
            alt={brand.siteName}
            className="max-h-10 w-auto max-w-full object-contain"
          />
        </div>
      )}
      <SidebarGroup>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={path === '/admin'} tooltip="Dashboard">
              <Link href="/admin">
                <LayoutDashboard />
                <span>Dashboard</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
      {groups.map((group) => (
        <SidebarGroup key={group.label}>
          <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
          <SidebarMenu>
            {group.items.map((item) => (
              <MenuEntry
                key={`${item.id}-${current === item}`}
                item={item}
                current={current === item}
                path={path}
              />
            ))}
          </SidebarMenu>
        </SidebarGroup>
      ))}
    </SidebarContent>
  )
}

function AdminBar() {
  const { user, admin, brand } = usePage().props

  return (
    <header className="bg-sidebar text-sidebar-foreground sticky top-0 z-20 flex h-11 shrink-0 items-center gap-1 border-b px-2 text-sm">
      <SidebarTrigger className="size-8" />
      <a
        href="/"
        target="_blank"
        rel="noreferrer"
        className="hover:bg-sidebar-accent flex items-center gap-2 rounded-md px-2 py-1.5 font-medium"
      >
        {brand?.faviconUrl ? (
          <img src={brand.faviconUrl} alt="" className="size-6 rounded-md object-contain" />
        ) : (
          <span className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md text-xs font-semibold">
            {admin?.siteName.charAt(0) ?? 'L'}
          </span>
        )}
        <span className="hidden sm:inline">{admin?.siteName}</span>
        <ExternalLink className="text-muted-foreground size-3.5" />
      </a>
      {admin?.newItems.length ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8">
              <Plus />
              New
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {admin.newItems.map((item) => (
              <DropdownMenuItem key={item.href} asChild>
                <Link href={item.href}>{item.label}</Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
      <ThemeToggle className="ml-auto" />
      {user && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-2">
              <span className="hidden sm:inline">
                Howdy, {user.fullName?.split(' ')[0] ?? user.email}
              </span>
              <Avatar className="size-6">
                <AvatarFallback className="text-[0.65rem]">{user.initials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="text-sm font-medium">{user.displayName}</div>
              <div className="text-muted-foreground text-xs">{user.roleName}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/admin/account">
                <UserRound />
                Edit profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => router.post('/admin/logout')}>
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </header>
  )
}

function FlashToasts() {
  const { flash } = usePage()

  useEffect(() => {
    if (flash.error) toast.error(flash.error)
    if (flash.success) toast.success(flash.success)
  }, [flash])

  const { dark } = useAppearance()

  return (
    <Toaster
      position="top-right"
      theme={dark ? 'dark' : 'light'}
      toastOptions={{ style: { boxShadow: 'var(--shadow-overlay)' } }}
    />
  )
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  setTimeZone(usePage().props.admin?.timezone)
  return (
    <SidebarProvider className="flex-col">
      <AdminBar />
      <div className="flex flex-1">
        <Sidebar collapsible="icon" className="top-11 h-[calc(100svh-2.75rem)]">
          <AdminMenu />
        </Sidebar>
        <SidebarInset>
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-16 md:px-8">
            {children}
          </main>
        </SidebarInset>
      </div>
      <FlashToasts />
      <KeyboardShortcuts />
    </SidebarProvider>
  )
}
