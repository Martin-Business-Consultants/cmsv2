import { PageSchema } from '#database/schema'
import {
  afterDelete,
  afterSave,
  beforeUpdate,
  belongsTo,
  hasMany,
  scope,
} from '@adonisjs/lucid/orm'
import { indexSearch, unindexSearch } from '#services/search'
import { applyLiveScope, recordIsLive, recordIsScheduled } from '#services/publishing'
import { localizePath } from '#services/locale_paths'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import type { Block, Field, FieldData, Seo, Status } from '#types/content'
import PageVersion from '#models/page_version'
import { indexReferences, removeReferences } from '#services/references'

export default class Page extends PageSchema {
  declare blocks: Block[]
  declare frontmatter: FieldData
  declare fields: Field[]
  declare seo: Seo
  declare status: Status

  @belongsTo(() => Page, { foreignKey: 'parentId' })
  declare parent: BelongsTo<typeof Page>

  @hasMany(() => Page, { foreignKey: 'parentId' })
  declare children: HasMany<typeof Page>

  @hasMany(() => PageVersion)
  declare versions: HasMany<typeof PageVersion>

  static active = scope((query) => {
    query.whereNull('deleted_at')
  })

  static trashed = scope((query) => {
    query.whereNotNull('deleted_at')
  })

  static live = scope((query) => {
    applyLiveScope(query)
  })

  @afterSave()
  static async syncReferences(record: Page) {
    await indexReferences('page', record)
  }

  @afterDelete()
  static async dropReferences(record: Page) {
    await removeReferences('page', record.id, record.$trx)
  }

  @beforeUpdate()
  static bumpLockVersion(record: Page) {
    if (record.$isDirty) record.lockVersion = (record.$original.lockVersion ?? 0) + 1
  }

  get publicPath() {
    return localizePath(this.path === 'home' ? '/' : `/${this.path}`, this.locale)
  }

  get isLive() {
    return recordIsLive(this)
  }

  get isScheduled() {
    return recordIsScheduled(this)
  }

  @afterSave()
  static async syncSearch(record: Page) {
    await indexSearch('page', record)
  }

  @afterDelete()
  static async dropSearch(record: Page) {
    await unindexSearch('page', record.id, record.$trx)
  }
}
