import { useEffect, useState, type ReactNode } from 'react'
import { router, usePage } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { ArrowRight, Eye, Mail, MapPin, Menu, Phone, X } from 'lucide-react'
import type { ResolvedLink, SiteContext } from '#types/site'
import { cn } from '~/lib/utils'
import SiteImage from '~/site/image'
import { Container } from '~/site/section'
import SmartLink from '~/site/smart_link'
import type { SiteShared } from '~/site/types'

type NavItem = { href: string; label: string }

function navItems(site: SiteContext | undefined): NavItem[] {
  const header: { link?: ResolvedLink | null }[] = site?.globals?.navigation?.header ?? []
  return header
    .map((item) => item.link)
    .filter((link): link is ResolvedLink => !!link?.href)
    .map((link) => ({ href: link.href, label: link.label || link.href }))
}

function isActive(url: string, href: string) {
  const path = url.split(/[?#]/)[0]
  if (href === '/') return path === '/'
  return path === href || path.startsWith(`${href}/`)
}

function Brand({ site }: { site: SiteContext | undefined }) {
  const name = site?.name ?? ''
  return (
    <Link
      route="site.home"
      className="flex shrink-0 items-center gap-2.5 font-semibold tracking-tight"
    >
      {site?.logo?.url ? (
        <SiteImage asset={site.logo} eager sizes="160px" className="h-8 w-auto" />
      ) : (
        <>
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
            {name.charAt(0).toUpperCase()}
          </span>
          <span className="text-[1.0625rem]">{name}</span>
        </>
      )}
    </Link>
  )
}

function PreviewBanner() {
  return (
    <div className="sticky top-0 z-50 bg-amber-400 text-amber-950">
      <Container className="flex h-10 items-center justify-between gap-4 text-sm">
        <span className="flex items-center gap-2 font-medium">
          <Eye className="size-4" />
          Preview — not published
        </span>
        <button
          type="button"
          onClick={() => window.history.back()}
          className="rounded-full px-3 py-1 font-medium hover:bg-amber-950/10"
        >
          Back to editor
        </button>
      </Container>
    </div>
  )
}

function Header({ site, preview }: { site: SiteContext | undefined; preview: boolean }) {
  const { url } = usePage()
  const [open, setOpen] = useState(false)
  const items = navItems(site)
  const cta = items.length > 1 ? items[items.length - 1] : null
  const links = cta ? items.slice(0, -1) : items

  useEffect(() => router.on('navigate', () => setOpen(false)), [])

  return (
    <header
      className={cn(
        'sticky z-40 border-b border-border/70 bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/70',
        preview ? 'top-10' : 'top-0'
      )}
    >
      <Container className="flex h-16 items-center justify-between gap-6">
        <Brand site={site} />
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {links.map((item) => (
            <SmartLink
              key={item.href}
              href={item.href}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground',
                isActive(url, item.href) && 'text-foreground'
              )}
            >
              {item.label}
            </SmartLink>
          ))}
          {cta && (
            <SmartLink
              href={cta.href}
              className="ml-3 inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              {cta.label}
            </SmartLink>
          )}
        </nav>
        {items.length > 0 && (
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="site-mobile-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="-mr-2 flex size-10 items-center justify-center rounded-full hover:bg-muted md:hidden"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        )}
      </Container>
      {open && (
        <div
          id="site-mobile-menu"
          className="absolute inset-x-0 top-full h-[calc(100svh-4rem)] overflow-y-auto border-t border-border/70 bg-background md:hidden"
        >
          <nav aria-label="Mobile" className="flex flex-col px-5 py-6">
            {items.map((item) => (
              <SmartLink
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-center justify-between border-b border-border py-4 text-2xl font-semibold tracking-tight',
                  isActive(url, item.href) ? 'text-foreground' : 'text-foreground/70'
                )}
              >
                {item.label}
                <ArrowRight className="size-5 text-muted-foreground" />
              </SmartLink>
            ))}
          </nav>
        </div>
      )}
    </header>
  )
}

function Footer({ site }: { site: SiteContext | undefined }) {
  const items = navItems(site)
  const footerText = site?.globals?.navigation?.footer_text
  const contact = site?.globals?.contact ?? {}
  const year = new Date().getFullYear()
  return (
    <footer className="mt-auto bg-primary text-primary-foreground">
      <Container className="grid gap-12 py-16 md:grid-cols-[1.5fr_1fr_1fr]">
        <div className="max-w-sm">
          <Link
            route="site.home"
            className="flex items-center gap-2.5 font-semibold tracking-tight"
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary-foreground text-sm font-bold text-primary">
              {(site?.name ?? '').charAt(0).toUpperCase()}
            </span>
            <span className="text-[1.0625rem]">{site?.name}</span>
          </Link>
          {site?.tagline && <p className="mt-4 text-primary-foreground/80">{site.tagline}</p>}
          {footerText && (
            <p className="mt-3 text-sm leading-relaxed whitespace-pre-line text-primary-foreground/60">
              {footerText}
            </p>
          )}
        </div>
        {items.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-primary-foreground/60">Explore</h2>
            <ul className="mt-4 space-y-3">
              <li>
                <Link
                  route="site.home"
                  className="text-primary-foreground/85 hover:text-primary-foreground"
                >
                  Home
                </Link>
              </li>
              {items.map((item) => (
                <li key={item.href}>
                  <SmartLink
                    href={item.href}
                    className="text-primary-foreground/85 hover:text-primary-foreground"
                  >
                    {item.label}
                  </SmartLink>
                </li>
              ))}
            </ul>
          </div>
        )}
        {(contact.email || contact.phone || contact.address) && (
          <div>
            <h2 className="text-sm font-semibold text-primary-foreground/60">Get in touch</h2>
            <ul className="mt-4 space-y-3 text-primary-foreground/85">
              {contact.phone && (
                <li className="flex items-start gap-3">
                  <Phone className="mt-1 size-4 shrink-0 text-primary-foreground/50" />
                  <a
                    href={`tel:${String(contact.phone).replace(/[^\d+]/g, '')}`}
                    className="hover:text-primary-foreground"
                  >
                    {contact.phone}
                  </a>
                </li>
              )}
              {contact.email && (
                <li className="flex items-start gap-3">
                  <Mail className="mt-1 size-4 shrink-0 text-primary-foreground/50" />
                  <a
                    href={`mailto:${contact.email}`}
                    className="break-all hover:text-primary-foreground"
                  >
                    {contact.email}
                  </a>
                </li>
              )}
              {contact.address && (
                <li className="flex items-start gap-3">
                  <MapPin className="mt-1 size-4 shrink-0 text-primary-foreground/50" />
                  <span className="whitespace-pre-line">{contact.address}</span>
                </li>
              )}
            </ul>
          </div>
        )}
      </Container>
      <div className="border-t border-primary-foreground/10">
        <Container className="flex flex-col gap-2 py-6 text-sm text-primary-foreground/55 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {site?.name}. All rights reserved.
          </p>
          <a href="/sitemap.xml" className="hover:text-primary-foreground">
            Sitemap
          </a>
        </Container>
      </div>
    </footer>
  )
}

export default function SiteLayout({ children }: { children: ReactNode }) {
  const { site, preview } = usePage<SiteShared>().props
  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground antialiased">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:shadow"
      >
        Skip to content
      </a>
      {preview && <PreviewBanner />}
      <Header site={site} preview={!!preview} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer site={site} />
    </div>
  )
}
