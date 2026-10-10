import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import BlockType from '#models/block_type'
import BlockTypeTransformer from '#transformers/block_type_transformer'
import { createBlockTypeValidator, updateBlockTypeValidator } from '#validators/block_type'
import { normalizeDefinitions } from '#services/fields'
import {
  checkBlockTypeSchema,
  installStarterPack,
  missingStarterTypes,
} from '#services/block_types'
import { editorProps } from '#services/blocks'
import { audit } from '#services/audit'
import { usageCounts, usedBy } from '#services/references'
import { applySearch, applySort, countBy, listParams, paginate } from '#services/listing'

type Usage = { kind: 'page' | 'entry' | 'global'; label: string; href: string; trashed: boolean }

async function usageOf(slug: string): Promise<Usage[]> {
  const usages = await usedBy('block_type', slug)
  return usages.map((usage) => ({
    kind: usage.ownerType,
    label: usage.ownerType === 'entry' ? `${usage.label} (${usage.detail})` : usage.label,
    href: usage.href,
    trashed: usage.trashed,
  }))
}

async function categories() {
  const rows = await db.from('block_types').distinct('category').whereNotNull('category')
  return rows
    .map((row) => String(row.category))
    .filter(Boolean)
    .sort()
}

export default class BlockTypesController {
  async index({ inertia, request, bouncer }: HttpContext) {
    await bouncer.authorize('access', 'block_types:read')
    const qs = request.qs()
    const list = listParams(qs, {
      sorts: { label: 'label', slug: 'slug', category: 'category' },
      sort: 'label',
    })
    const base = BlockType.query()
    const byCategory = await countBy(base, 'category')
    const merged = new Map<string, number>()
    for (const [name, count] of Object.entries(byCategory)) {
      const value = name === 'null' || name === '' ? '_none' : name
      merged.set(value, (merged.get(value) ?? 0) + count)
    }
    const categoryCounts = [...merged]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value))
    const category = categoryCounts.some((option) => option.value === qs.category)
      ? String(qs.category)
      : ''

    const query = applySearch(base.clone(), list.search, ['label', 'slug', 'description'])
    if (category === '_none') query.where((q) => q.whereNull('category').orWhere('category', ''))
    else if (category) query.where('category', category)
    if (!list.sorted) query.orderBy('category')
    applySort(query, list)
    const { rows, meta } = await paginate(query, list.page)
    const counts = await usageCounts(
      'block_type',
      rows.map((type) => type.slug)
    )
    const missing = await missingStarterTypes()

    return inertia.render('admin/block_types/index', {
      blockTypes: rows.map((type) => ({
        id: type.id,
        slug: type.slug,
        label: type.label,
        category: type.category,
        description: type.description,
        icon: type.icon,
        fieldCount: (type.fields ?? []).length,
        deprecated: type.deprecated,
        builtIn: type.builtIn,
        usage: (({ page, entry, global }) => ({ pages: page, entries: entry, globals: global }))(
          counts.get(type.slug)!
        ),
      })),
      starterMissing: missing.length,
      meta,
      categories: categoryCounts,
      total: Object.values(byCategory).reduce((sum, count) => sum + count, 0),
      filters: {
        search: list.search,
        category,
        sort: list.sorted ? list.sort : '',
        order: list.order,
      },
    })
  }

  async create({ inertia, bouncer }: HttpContext) {
    await bouncer.authorize('access', 'block_types:write')
    return inertia.render('admin/block_types/create', {
      ...(await editorProps()),
      categories: await categories(),
    })
  }

  async store(ctx: HttpContext) {
    const { request, response, bouncer, session } = ctx
    await bouncer.authorize('access', 'block_types:write')
    const values = await request.validateUsing(createBlockTypeValidator)
    const fields = normalizeDefinitions(values.fields)
    const defaults = await checkBlockTypeSchema(values.slug, values.label, fields, values.defaults)

    const blockType = await BlockType.create({
      slug: values.slug,
      label: values.label,
      category: values.category || null,
      description: values.description || null,
      icon: values.icon || null,
      fields,
      defaults,
      deprecated: values.deprecated ?? false,
      builtIn: false,
      version: values.version ?? 1,
    })
    await audit(ctx, 'block_type.created', blockType)

    session.flash('success', 'Block type created')
    return response.redirect().toRoute('admin.block_types.edit', { id: blockType.id })
  }

  async edit({ inertia, params, bouncer }: HttpContext) {
    await bouncer.authorize('access', 'block_types:read')
    const blockType = await BlockType.findOrFail(params.id)

    return inertia.render('admin/block_types/edit', {
      blockType: BlockTypeTransformer.transform(blockType),
      ...(await editorProps()),
      categories: await categories(),
      usage: await usageOf(blockType.slug),
    })
  }

  async update(ctx: HttpContext) {
    const { request, response, params, bouncer, session } = ctx
    await bouncer.authorize('access', 'block_types:write')
    const blockType = await BlockType.findOrFail(params.id)
    const values = await request.validateUsing(updateBlockTypeValidator)
    const fields = normalizeDefinitions(values.fields)
    const defaults = await checkBlockTypeSchema(blockType.slug, values.label, fields, values.defaults)

    blockType.merge({
      label: values.label,
      category: values.category || null,
      description: values.description || null,
      icon: values.icon || null,
      fields,
      defaults,
      deprecated: values.deprecated ?? blockType.deprecated,
      version: values.version ?? blockType.version,
    })
    await blockType.save()
    await audit(ctx, 'block_type.updated', blockType)

    session.flash('success', 'Block type saved')
    return response.redirect().back()
  }

  async seed(ctx: HttpContext) {
    const { response, bouncer, session } = ctx
    await bouncer.authorize('access', 'block_types:write')
    const installed = await installStarterPack()
    if (installed.length) {
      await audit(ctx, 'block_types.seeded', null, { count: installed.length, slugs: installed })
      session.flash(
        'success',
        `Installed ${installed.length} starter block ${installed.length === 1 ? 'type' : 'types'}`
      )
    } else {
      session.flash('success', 'The starter block types are already installed')
    }
    return response.redirect().toRoute('admin.block_types.index')
  }

  async destroy(ctx: HttpContext) {
    const { params, response, bouncer, session } = ctx
    await bouncer.authorize('access', 'block_types:delete')
    const blockType = await BlockType.findOrFail(params.id)
    const usage = await usageOf(blockType.slug)
    if (usage.length) {
      session.flash(
        'error',
        `${blockType.label} is still used in ${usage.length} ${usage.length === 1 ? 'place' : 'places'}. Remove it there first.`
      )
      return response.redirect().back()
    }

    await blockType.delete()
    await audit(ctx, 'block_type.deleted', blockType)

    session.flash('success', 'Block type deleted')
    return response.redirect().toRoute('admin.block_types.index')
  }
}
