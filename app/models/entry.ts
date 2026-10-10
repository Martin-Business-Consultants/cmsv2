import { EntrySchema } from '#database/schema'
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
import type { Block, FieldData, RichTextDoc, Seo, Status } from '#types/content'
import Collection from '#models/collection'
import EntryVersion from '#models/entry_version'
import { indexReferences, removeReferences } from '#services/references'

export default class Entry extends EntrySchema {
  declare data: FieldData
  declare body: RichTextDoc | null
  declare blocks: Block[]
  declare seo: Seo
  declare status: Status

  @belongsTo(() => Collection)
  declare collection: BelongsTo<typeof Collection>

  @hasMany(() => EntryVersion)
  declare versions: HasMany<typeof EntryVersion>

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
  static async syncReferences(record: Entry) {
    await indexReferences('entry', record)
  }

  @afterDelete()
  static async dropReferences(record: Entry) {
    await removeReferences('entry', record.id, record.$trx)
  }

  @beforeUpdate()
  static bumpLockVersion(record: Entry) {
    if (record.$isDirty) record.lockVersion = (record.$original.lockVersion ?? 0) + 1
  }

  get isLive() {
    return recordIsLive(this)
  }

  get isScheduled() {
    return recordIsScheduled(this)
  }

  get publicPath() {
    const prefix = this.collection?.urlPrefix
    return prefix ? localizePath(`/${prefix}/${this.slug}`, this.locale) : null
  }

  @afterSave()
  static async syncSearch(record: Entry) {
    await indexSearch('entry', record)
  }

  @afterDelete()
  static async dropSearch(record: Entry) {
    await unindexSearch('entry', record.id, record.$trx)
  }
}
