import { TaggingSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Entry from '#models/entry'

export type TaggableType = 'page' | 'entry'

export default class Tagging extends TaggingSchema {
  declare taggableType: TaggableType

  @belongsTo(() => Entry, { foreignKey: 'tagEntryId' })
  declare tag: BelongsTo<typeof Entry>
}
