import { randomBytes } from 'node:crypto'
import BlockType from '#models/block_type'
import {
  COLLECTION_TEMPLATES,
  PAGE_TEMPLATES,
  type CollectionTemplate,
  type PageTemplate,
} from '#database/data/templates'
import type { Block } from '#types/content'

export type PageTemplateOption = {
  key: string
  title: string
  slug: string
  description: string
  icon: string
  blocks: string[]
}

export type CollectionTemplateOption = {
  key: string
  name: string
  singularName: string
  slug: string
  description: string
  icon: string
  fields: string[]
}

function blockId() {
  return randomBytes(4).toString('hex')
}

async function installedTypes() {
  const rows = await BlockType.query().select('slug', 'label', 'version')
  return new Map(rows.map((row) => [row.slug, row]))
}

export function pageTemplate(key: unknown): PageTemplate | null {
  return PAGE_TEMPLATES.find((template) => template.key === key) ?? null
}

export function collectionTemplate(key: unknown): CollectionTemplate | null {
  return COLLECTION_TEMPLATES.find((template) => template.key === key) ?? null
}

export async function availablePageTemplates(): Promise<PageTemplateOption[]> {
  const types = await installedTypes()
  return PAGE_TEMPLATES.filter((template) =>
    template.blocks.every((block) => types.has(block.type))
  ).map((template) => ({
    key: template.key,
    title: template.title,
    slug: template.slug,
    description: template.description,
    icon: template.icon,
    blocks: template.blocks.map((block) => types.get(block.type)?.label ?? block.type),
  }))
}

export async function availablePageTemplate(key: unknown) {
  const template = pageTemplate(key)
  if (!template) return null
  const types = await installedTypes()
  return template.blocks.every((block) => types.has(block.type)) ? template : null
}

export async function templateBlocks(template: PageTemplate): Promise<Block[]> {
  const types = await installedTypes()
  return template.blocks.map((block) => ({
    id: blockId(),
    type: block.type,
    version: types.get(block.type)?.version ?? 1,
    data: structuredClone(block.data),
  }))
}

export function collectionTemplateOptions(): CollectionTemplateOption[] {
  return COLLECTION_TEMPLATES.map((template) => ({
    key: template.key,
    name: template.name,
    singularName: template.singularName,
    slug: template.slug,
    description: template.description,
    icon: template.icon,
    fields: template.fields.map((field) => field.label ?? field.name),
  }))
}

function singular(name: string) {
  if (/ies$/i.test(name)) return name.replace(/ies$/i, 'y')
  if (/(ss|us)$/i.test(name)) return name
  return name.replace(/s$/i, '')
}

export function prepareCollection(input: Record<string, any>) {
  const template = collectionTemplate(input.template)
  const blank = (value: unknown) => typeof value !== 'string' || !value.trim()
  const values = { ...input }
  if (template) {
    values.fields = structuredClone(template.fields)
    if (blank(values.name)) values.name = template.name
    if (blank(values.slug)) values.slug = template.slug
    if (blank(values.icon)) values.icon = template.icon
    if (blank(values.singularName)) {
      values.singularName = values.name === template.name ? template.singularName : ''
    }
    if (values.urlPrefix === undefined) values.urlPrefix = template.urlPrefix
  }
  if (blank(values.singularName) && !blank(values.name)) {
    values.singularName = singular(String(values.name).trim())
  }
  if (!Array.isArray(values.fields)) values.fields = []
  return { values, template }
}
