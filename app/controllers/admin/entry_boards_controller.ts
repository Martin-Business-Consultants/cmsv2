import type { HttpContext } from '@adonisjs/core/http'
import Collection from '#models/collection'
import Entry from '#models/entry'
import CollectionTransformer from '#transformers/collection_transformer'
import { findEntry } from '#services/entries'
import {
  boardCards,
  boardOf,
  booleanField,
  canMoveCards,
  castBoolean,
  fieldLabel,
  inlineField,
  inlineValue,
  placeOnBoard,
  serializeBoard,
  setField,
} from '#services/board'

function actorOf(ctx: HttpContext) {
  return { ctx, user: ctx.auth.use('web').user ?? null }
}

export default class EntryBoardsController {
  async show({ inertia, params, bouncer, auth, response, session }: HttpContext) {
    await bouncer.authorize('access', 'entries:read')
    const collection = await Collection.findOrFail(params.collectionId)
    const board = boardOf(collection)
    if (!board) {
      session.flash('error', 'Choose the field the Build board’s columns stand for.')
      return response.redirect().toRoute('admin.collections.edit', { id: collection.id })
    }
    const entries = await Entry.query()
      .where('collection_id', collection.id)
      .whereNull('deleted_at')
      .orderBy('title')
    const user = auth.use('web').user!

    return inertia.render('admin/entries/board', {
      collection: CollectionTransformer.transform(collection),
      board: serializeBoard(board),
      cards: await boardCards(board, entries),
      canMove: canMoveCards(board, (capability) => user.can(capability)),
    })
  }

  async flag(ctx: HttpContext) {
    const { params, request, response, bouncer, session } = ctx
    await bouncer.authorize('access', 'entries:write')
    const collection = await Collection.findOrFail(params.collectionId)
    const entry = await findEntry(collection, params.id)
    const field = booleanField(collection, request.input('field'))
    if (!field) {
      session.flash('error', 'Unknown yes/no field.')
      return response.redirect().back()
    }
    const value = castBoolean(request.input('value'))
    const errors = await setField(actorOf(ctx), entry, collection, field, value)
    if (errors.length) session.flash('error', errors.map((error) => error.message).join(', '))
    else session.flash('success', `${fieldLabel(field)} ${value ? 'on' : 'off'} for ${entry.title}`)
    return response.redirect().back()
  }

  async cardField(ctx: HttpContext) {
    const { params, request, response, bouncer, session } = ctx
    await bouncer.authorize('access', 'entries:write')
    const collection = await Collection.findOrFail(params.collectionId)
    const entry = await findEntry(collection, params.id)
    const field = inlineField(collection, request.input('field'))
    if (!field) {
      session.flash('error', `${request.input('field')} can’t be edited from the board.`)
      return response.redirect().back()
    }
    const value = await inlineValue(field, request.input('value'))
    const errors = await setField(actorOf(ctx), entry, collection, field, value)
    if (errors.length) session.flash('error', errors.map((error) => error.message).join(', '))
    else session.flash('success', `${fieldLabel(field)} updated for ${entry.title}`)
    return response.redirect().back()
  }

  async place(ctx: HttpContext) {
    const { params, request, response, bouncer, session, auth } = ctx
    await bouncer.authorize('access', 'entries:write')
    const collection = await Collection.findOrFail(params.collectionId)
    const entry = await findEntry(collection, params.id)
    const board = boardOf(collection)
    const user = auth.use('web').user!
    if (!board) {
      session.flash('error', 'This collection has no Build board.')
    } else if (!canMoveCards(board, (capability) => user.can(capability))) {
      session.flash('error', 'Moving a card here publishes it, which needs publish access.')
    } else {
      const on = request.input('column') === 'on'
      await placeOnBoard(actorOf(ctx), entry, collection, board, on)
      session.flash('success', `${entry.title} moved to ${board.labels[on ? 'on' : 'off']}`)
    }
    return response.redirect().back()
  }
}
