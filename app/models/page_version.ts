import { PageVersionSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type { Block, FieldData, Seo } from '#types/content'
import User from '#models/user'

export default class PageVersion extends PageVersionSchema {
  declare blocks: Block[]
  declare frontmatter: FieldData | null
  declare seo: Seo

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
