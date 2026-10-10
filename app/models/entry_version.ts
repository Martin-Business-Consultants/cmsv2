import { EntryVersionSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type { Block, FieldData, RichTextDoc, Seo } from '#types/content'
import User from '#models/user'

export default class EntryVersion extends EntryVersionSchema {
  declare data: FieldData
  declare body: RichTextDoc | null
  declare blocks: Block[] | null
  declare seo: Seo

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
