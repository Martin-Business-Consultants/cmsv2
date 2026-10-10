import { readdir, stat } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'
import emitter from '@adonisjs/core/services/emitter'
import type { HttpContext } from '@adonisjs/core/http'
import type { Router } from '@adonisjs/core/http'
import type { BlockTypeOption, Field } from '#types/content'
import type { ResolvedAsset } from '#types/site'
import { CAPABILITIES, type Capability } from '#types/permissions'

export type MenuGroup =
  'Content' | 'Insights' | 'Tools' | 'Access' | 'Help' | 'Settings' | (string & {})

export type MenuItemDefinition = {
  id: string
  label: string
  icon: string
  group: MenuGroup
  href?: string
  capability?: string
  after?: string
}

export type SubmenuItemDefinition = {
  parent: string
  label: string
  href: string
  capability?: string
  after?: string
}

export type NewItemDefinition = {
  label: string
  href: string
  capability?: string
  after?: string
}

export type SettingsPageDefinition = {
  id: string
  label: string
  href: string
  description?: string
  capability?: string
}

export type DashboardWidgetDefinition = {
  id: string
  title: string
  component: string
  capability?: string
  props?: (ctx: HttpContext) => Promise<Record<string, unknown>> | Record<string, unknown>
}

export type PermissionGroupDefinition = {
  group: string
  capabilities: string[]
  after?: string
  defaults?: Record<string, string[]>
}

export type FieldTypeDefinition = {
  type: string
  label: string
  input: string
  validate?: (value: unknown, field: Field) => string | null
  resolve?: (value: unknown, field: Field, options: { live: boolean }) => Promise<unknown>
  references?: (value: unknown, field: Field) => { type: string; id: string | number }[]
  jsonSchema?: Record<string, unknown>
}

export type TrashableDefinition = {
  kind: string
  label: string
  list: () => Promise<{ id: number; title: string; detail?: string; deletedAt: string | null }[]>
  restore: (id: number) => Promise<void>
  purge: (id: number) => Promise<void>
}

export type SearchDocument = { id: number; title: string; body: string }

export type SearchableDefinition = {
  kind: string
  label: string
  capability: string
  href: (id: number) => string
  documents: () => Promise<SearchDocument[]>
}

export type FormsHealth = {
  silent: string[]
  sender: string | null
}

export type MediaLibrary = {
  resolve: (ids: number[]) => Promise<Map<number, ResolvedAsset>>
  imagesWithoutAlt?: () => Promise<{ total: number; inUse: ResolvedAsset[] }>
  deliver?: (
    ids: number[]
  ) => Promise<Map<number, Record<string, unknown> & { id: number; url: string }>>
}

export type Provided = {
  media: MediaLibrary
  publishedForms: () => Promise<number>
  spamProtection: () => Promise<boolean>
  formsHealth: () => Promise<FormsHealth>
}

export type ActionPayload = {
  action: string
  subject: { type: string | null; id: number | null; label: string | null; record?: unknown }
  metadata: Record<string, unknown>
  userId: number | null
}

export type WebhookEventsOptions = {
  payload?: (action: ActionPayload) => unknown
}

export type WebhookEventGroupDefinition = WebhookEventsOptions & {
  label: string
  events: string[]
}

export type WebhookEventFilterDefinition = {
  event: string
  permit: (raw: unknown) => unknown
  validate?: (value: unknown) => string | null
  match: (value: unknown, data: unknown) => boolean
}

export type DeployChange = {
  event: string
  kind?: string
  id?: number
  path?: string | null
  locale?: string | null
  tags: string[]
}

export type DeployAttempt = {
  status: 'success' | 'failure'
  httpStatus: number | null
  error: string | null
}

export type DeployConfig = {
  provider?: string
  url?: string
  paused?: boolean
  [key: string]: unknown
}

export type DeployProviderDefinition = {
  key: string
  label: string
  configured: (config: DeployConfig) => boolean | Promise<boolean>
  target?: (config: DeployConfig) => string | null | Promise<string | null>
  fire: (input: {
    reason: string
    changes: DeployChange[]
    config: DeployConfig
  }) => Promise<DeployAttempt>
}

declare module '@adonisjs/core/types' {
  interface EventsList {
    'cms:plugin_event': ActionPayload
  }
}

export type Filters = {
  'site.headHtml': { value: string; context: { path: string } }
  'sitemap.entries': { value: { url: string; lastmod: string | null }[]; context: {} }
  'site.props': { value: Record<string, unknown>; context: { path: string } }
  'api.siteConfig': { value: Record<string, unknown>; context: {} }
}

type RouteScope = 'admin' | 'site' | 'api'

export type PluginApi = {
  readonly key: string
  menu(item: MenuItemDefinition): void
  submenu(item: SubmenuItemDefinition): void
  newItem(item: NewItemDefinition): void
  settingsPage(page: SettingsPageDefinition): void
  dashboardWidget(widget: DashboardWidgetDefinition): void
  permissions(group: PermissionGroupDefinition): void
  blockTypes(types: BlockTypeOption[]): void
  fieldType(definition: FieldTypeDefinition): void
  trashable(definition: TrashableDefinition): void
  searchable(definition: SearchableDefinition): void
  routes(scope: RouteScope, define: (router: Router) => void): void
  on(action: string, listener: (payload: ActionPayload) => unknown): void
  filter<Name extends keyof Filters>(
    name: Name,
    filter: (
      value: Filters[Name]['value'],
      context: Filters[Name]['context']
    ) => Filters[Name]['value'] | Promise<Filters[Name]['value']>
  ): void
  provide<Name extends keyof Provided>(name: Name, value: Provided[Name]): void
  bootstrap(task: () => Promise<void>): void
  nightly(task: () => Promise<void>): void
  minutely(name: string, task: () => Promise<void>, options?: { every?: number }): void
  api(path: string, description: string): void
  webhookEvents(label: string, events: string[], options?: WebhookEventsOptions): void
  webhookEventFilter(event: string, filter: Omit<WebhookEventFilterDefinition, 'event'>): void
  deployProvider(definition: DeployProviderDefinition): void
}

export type PluginDefinition = {
  key: string
  name: string
  version: string
  description: string
  author?: string
  homepage?: string
  enabledByDefault?: boolean
  dependsOn?: string[]
  register(cms: PluginApi): void
}

export function definePlugin(definition: PluginDefinition) {
  return definition
}

type Owned<T> = T & { plugin: string }

const KEY_FORMAT = /^[a-z][a-z0-9_]*$/

class PluginRegistry {
  definitions = new Map<string, PluginDefinition & { path: string }>()
  menus: Owned<MenuItemDefinition>[] = []
  submenus: Owned<SubmenuItemDefinition>[] = []
  newItems: Owned<NewItemDefinition>[] = []
  settingsPages: Owned<SettingsPageDefinition>[] = []
  widgets: Owned<DashboardWidgetDefinition>[] = []
  permissionGroups: Owned<PermissionGroupDefinition>[] = []
  blockTypePacks: Owned<{ types: BlockTypeOption[] }>[] = []
  fieldTypes: Owned<FieldTypeDefinition>[] = []
  trashables: Owned<TrashableDefinition>[] = []
  searchables: Owned<SearchableDefinition>[] = []
  routeDefinitions: Owned<{ scope: RouteScope; define: (router: Router) => void }>[] = []
  listeners: Owned<{ action: string; listener: (payload: ActionPayload) => unknown }>[] = []
  filters: Owned<{ name: string; filter: (value: any, context: any) => any }>[] = []
  provisions: Owned<{ name: string; value: unknown }>[] = []
  bootstraps: Owned<{ task: () => Promise<void> }>[] = []
  nightlies: Owned<{ task: () => Promise<void> }>[] = []
  minutelies: Owned<{ name: string; task: () => Promise<void>; every: number }>[] = []
  endpoints: Owned<{ path: string; description: string }>[] = []
  webhookEventGroups: Owned<WebhookEventGroupDefinition>[] = []
  webhookEventFilters: Owned<WebhookEventFilterDefinition>[] = []
  deployProviders: Owned<DeployProviderDefinition>[] = []
  state = new Map<string, boolean>()
  loaded = false

  async discover() {
    if (this.loaded) return
    this.loaded = true
    const root = app.makePath('plugins')
    const entries = await readdir(root).catch(() => [] as string[])
    for (const entry of entries.sort()) {
      const directory = `${root}/${entry}`
      const info = await stat(directory)
      if (!info.isDirectory()) continue
      const file = await this.#entryFile(directory)
      if (!file) continue
      try {
        const module = await import(pathToFileURL(file).href)
        this.register(module.default as PluginDefinition, directory)
      } catch (error) {
        logger.error({ err: error, plugin: entry }, 'Could not load plugin')
      }
    }
  }

  async #entryFile(directory: string) {
    for (const name of ['plugin.js', 'plugin.ts']) {
      const file = `${directory}/${name}`
      if (await stat(file).catch(() => null)) return file
    }
    return null
  }

  register(definition: PluginDefinition, path: string) {
    if (!definition?.key || !KEY_FORMAT.test(definition.key)) {
      throw new Error(`Plugin at ${path} needs a lowercase key`)
    }
    if (this.definitions.has(definition.key)) return
    this.definitions.set(definition.key, { ...definition, path })
    definition.register(this.#api(definition.key))
  }

  #api(plugin: string): PluginApi {
    const own = <T>(value: T) => ({ ...value, plugin })
    return {
      key: plugin,
      menu: (item) => this.menus.push(own(item)),
      submenu: (item) => this.submenus.push(own(item)),
      newItem: (item) => this.newItems.push(own(item)),
      settingsPage: (page) => this.settingsPages.push(own(page)),
      dashboardWidget: (widget) => this.widgets.push(own(widget)),
      permissions: (group) => this.permissionGroups.push(own(group)),
      blockTypes: (types) => this.blockTypePacks.push(own({ types })),
      fieldType: (definition) => this.fieldTypes.push(own(definition)),
      trashable: (definition) => this.trashables.push(own(definition)),
      searchable: (definition) => this.searchables.push(own(definition)),
      routes: (scope, define) => this.routeDefinitions.push(own({ scope, define })),
      on: (action, listener) => this.listeners.push(own({ action, listener })),
      filter: (name, filter) => this.filters.push(own({ name, filter })),
      provide: (name, value) => this.provisions.push(own({ name, value })),
      bootstrap: (task) => this.bootstraps.push(own({ task })),
      nightly: (task) => this.nightlies.push(own({ task })),
      minutely: (name, task, options) =>
        this.minutelies.push(
          own({ name, task, every: Math.max(1, Math.floor(options?.every ?? 1)) })
        ),
      api: (path, description) => this.endpoints.push(own({ path, description })),
      webhookEvents: (label, events, options) =>
        this.webhookEventGroups.push(own({ ...options, label, events })),
      webhookEventFilter: (event, filter) =>
        this.webhookEventFilters.push(own({ ...filter, event })),
      deployProvider: (definition) => this.deployProviders.push(own(definition)),
    }
  }

  setState(state: Record<string, boolean>) {
    this.state = new Map(Object.entries(state))
  }

  isSwitchedOn(key: string) {
    const definition = this.definitions.get(key)
    if (!definition) return false
    return this.state.get(key) ?? Boolean(definition.enabledByDefault)
  }

  isEnabled(key: string, seen = new Set<string>()): boolean {
    if (seen.has(key)) return false
    seen.add(key)
    const definition = this.definitions.get(key)
    if (!definition || !this.isSwitchedOn(key)) return false
    return (definition.dependsOn ?? []).every((dependency) => this.isEnabled(dependency, seen))
  }

  missingDependencies(key: string) {
    return (this.definitions.get(key)?.dependsOn ?? []).filter(
      (dependency) => !this.isEnabled(dependency)
    )
  }

  enabled<T extends { plugin: string }>(list: T[]) {
    return list.filter((item) => this.isEnabled(item.plugin))
  }

  provided<Name extends keyof Provided>(name: Name): Provided[Name] | null {
    const provision = this.enabled(this.provisions).find((item) => item.name === name)
    return (provision?.value as Provided[Name]) ?? null
  }

  fieldType(type: string) {
    return this.enabled(this.fieldTypes).find((definition) => definition.type === type) ?? null
  }

  permissionCatalog() {
    const catalog: { group: string; capabilities: string[] }[] = Object.entries(CAPABILITIES).map(
      ([group, capabilities]) => ({ group, capabilities: [...capabilities] })
    )
    for (const addition of this.enabled(this.permissionGroups)) {
      const index = catalog.findIndex((entry) => entry.group === addition.after)
      const entry = { group: addition.group, capabilities: addition.capabilities }
      if (index === -1) catalog.push(entry)
      else catalog.splice(index + 1, 0, entry)
    }
    return catalog
  }

  allCapabilities(): string[] {
    const known = new Set<string>(Object.values(CAPABILITIES).flat() as Capability[])
    for (const group of this.permissionGroups) group.capabilities.forEach((c) => known.add(c))
    return [...known]
  }

  dueMinutelyTasks(at: Date) {
    const minute = Math.floor(at.getTime() / 60_000)
    return this.enabled(this.minutelies).filter((entry) => minute % entry.every === 0)
  }

  webhookEventGroup(event: string) {
    return (
      this.enabled(this.webhookEventGroups).find((group) => group.events.includes(event)) ?? null
    )
  }

  webhookEventFilter(event: string) {
    return this.enabled(this.webhookEventFilters).find((filter) => filter.event === event) ?? null
  }

  async emit(payload: ActionPayload) {
    for (const { action, listener, plugin } of this.enabled(this.listeners)) {
      if (
        action !== payload.action &&
        action !== '*' &&
        !(action.endsWith('.*') && payload.action.startsWith(action.slice(0, -1)))
      )
        continue
      try {
        await listener(payload)
      } catch (error) {
        logger.error({ err: error, plugin, action: payload.action }, 'Plugin listener failed')
      }
    }
    if (this.webhookEventGroup(payload.action)) {
      try {
        await emitter.emit('cms:plugin_event', payload)
      } catch (error) {
        logger.error({ err: error, action: payload.action }, 'Plugin event listener failed')
      }
    }
  }

  async applyFilters<Name extends keyof Filters>(
    name: Name,
    value: Filters[Name]['value'],
    context: Filters[Name]['context']
  ): Promise<Filters[Name]['value']> {
    let current = value
    for (const { filter } of this.enabled(this.filters).filter((item) => item.name === name)) {
      current = await filter(current, context)
    }
    return current
  }

  registerRoutes(
    router: Router,
    scopes: Record<RouteScope, (define: () => void, plugin: string) => void>
  ) {
    for (const { scope, define, plugin } of this.routeDefinitions) {
      scopes[scope](() => define(router), plugin)
    }
  }
}

export const plugins = new PluginRegistry()
