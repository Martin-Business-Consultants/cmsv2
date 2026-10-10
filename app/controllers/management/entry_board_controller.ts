import type { HttpContext } from '@adonisjs/core/http'
import Collection from '#models/collection'
import Entry from '#models/entry'
import { callerOf, granted, iso, type Authorization } from '#services/management'
import { ApiProblem, forbidden, notFound } from '#services/api_errors'
import { taxonomyFor } from '#services/taxonomy'
import {
  boardOf,
  booleanField,
  booleanFields,
  castBoolean,
  inlineField,
  inlineFields,
  inlineValue,
  placeOnBoard,
  setField,
} from '#services/board'
import type { FieldError } from '#services/fields'

async function scoped(ctx: HttpContext) {
  const collection = await Collection.findBy('slug', ctx.params.slug)
  if (!collection) notFound(`Couldn't find Collection with 'slug'=${ctx.params.slug}`)
  const entry = await Entry.query()
    .where('collection_id', collection.id)
    .where('slug', ctx.params.entrySlug)
    .whereNull('deleted_at')
    .orderBy('id')
    .first()
  if (!entry) notFound(`Couldn't find CollectionEntry with 'slug'=${ctx.params.entrySlug}`)
  entry.$setRelated('collection', collection)
  return { collection, entry }
}

function unprocessable(body: Record<string, unknown> & { message: string }): never {
  throw new ApiProblem(422, { error: 'invalid', ...body })
}

function rejected(errors: FieldError[]): never {
  throw new ApiProblem(422, {
    error: 'invalid',
    errors: { frontmatter: errors.map((error) => error.message) },
  })
}

async function serialize(entry: Entry, collection: Collection) {
  const taxonomy = await taxonomyFor('entry', entry)
  return {
    entry: {
      id: entry.id,
      slug: entry.slug,
      title: entry.title,
      status: entry.status,
      locale: entry.locale,
      frontmatter: entry.data ?? {},
      seo: entry.seo ?? {},
      body: entry.body ?? null,
      blocks: entry.blocks ?? [],
      published_at: iso(entry.publishedAt),
      created_at: iso(entry.createdAt),
      updated_at: iso(entry.updatedAt),
      collection_slug: collection.slug,
      category: taxonomy.category,
      tags: taxonomy.tags,
    },
  }
}

function actorOf(ctx: HttpContext) {
  return { ctx, user: callerOf(ctx).user }
}

export default class EntryBoardController {
  static capabilities: Authorization = {
    toggleField: 'entries:write',
    updateField: 'entries:write',
    move: 'entries:write',
  }

  async toggleField(ctx: HttpContext) {
    const { collection, entry } = await scoped(ctx)
    const name = ctx.request.input('field')
    const field = booleanField(collection, name)
    if (!field) {
      unprocessable({
        message: `${JSON.stringify(name ?? null)} is not a boolean field on ${collection.slug}`,
        boolean_fields: booleanFields(collection).map((found) => found.name),
      })
    }
    const value = ctx.request.input('value')
    if (value === undefined) unprocessable({ message: 'value is required: true or false' })
    const errors = await setField(
      actorOf(ctx),
      entry,
      collection,
      field,
      value === null ? null : castBoolean(value),
      { keepNil: true }
    )
    if (errors.length) rejected(errors)
    return serialize(entry, collection)
  }

  async updateField(ctx: HttpContext) {
    const { collection, entry } = await scoped(ctx)
    const name = ctx.request.input('field')
    const field = inlineField(collection, name)
    if (!field) {
      unprocessable({
        message: `${JSON.stringify(name ?? null)} is not an inline-editable field on ${collection.slug}`,
        inline_fields: inlineFields(collection).map((found) => found.name),
      })
    }
    const value = await inlineValue(field, ctx.request.input('value'))
    const errors = await setField(actorOf(ctx), entry, collection, field, value)
    if (errors.length) rejected(errors)
    return serialize(entry, collection)
  }

  async move(ctx: HttpContext) {
    const { collection, entry } = await scoped(ctx)
    const board = boardOf(collection)
    if (!board) {
      unprocessable({
        message: `${collection.slug} has no Build board — set build_config.field on its schema first`,
      })
    }
    if (board.publishes && !granted(ctx, 'entries:publish')) forbidden('entries:publish')
    await placeOnBoard(actorOf(ctx), entry, collection, board, castBoolean(ctx.request.input('on')))
    return serialize(entry, collection)
  }
}
