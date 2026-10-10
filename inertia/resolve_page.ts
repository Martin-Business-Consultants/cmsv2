import { resolvePageComponent } from '@adonisjs/inertia/helpers'
import type { ResolvedComponent } from '@inertiajs/react'
import AdminLayout from '~/layouts/admin'
import SiteLayout from '~/site/layout'

type PageModule = { default: ResolvedComponent }

function sectionOf(name: string, pages: Record<string, unknown>) {
  if (`./pages/${name}.tsx` in pages) return name
  return name.split('/').slice(1).join('/')
}

function pathOf(name: string, pages: Record<string, unknown>) {
  const core = `./pages/${name}.tsx`
  if (core in pages) return core
  const [plugin, ...rest] = name.split('/')
  return `../plugins/${plugin}/inertia/pages/${rest.join('/')}.tsx`
}

export async function resolvePage(name: string, pages: Record<string, unknown>) {
  const page = await resolvePageComponent<PageModule>(
    pathOf(name, pages),
    pages as Record<string, PageModule>
  )
  const component = page.default as ResolvedComponent & { layout?: unknown }
  const section = sectionOf(name, pages)
  if (component.layout === undefined) {
    if (section.startsWith('admin/') && section !== 'admin/login') component.layout = AdminLayout
    if (section.startsWith('site/')) component.layout = SiteLayout
  }
  return component
}
