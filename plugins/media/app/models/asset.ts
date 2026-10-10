import { afterDelete, afterSave, BaseModel, column, scope } from '@adonisjs/lucid/orm'
import { indexSearchDocument, unindexSearch } from '#services/search'
import type { DateTime } from 'luxon'
import type { AssetVariant } from '#types/content'

export default class Asset extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare key: string

  @column()
  declare filename: string

  @column()
  declare title: string | null

  @column()
  declare mimeType: string

  @column()
  declare size: number

  @column()
  declare width: number | null

  @column()
  declare height: number | null

  @column()
  declare alt: string | null

  @column()
  declare caption: string | null

  @column()
  declare description: string | null

  @column()
  declare folder: string

  @column()
  declare focalX: number

  @column()
  declare focalY: number

  @column({
    prepare: (value: AssetVariant[]) => JSON.stringify(value ?? []),
    consume: (value: unknown) => (typeof value === 'string' ? JSON.parse(value) : (value ?? [])),
  })
  declare variants: AssetVariant[]

  @column.dateTime()
  declare deletedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  static active = scope((query) => {
    query.whereNull('deleted_at')
  })

  static trashed = scope((query) => {
    query.whereNotNull('deleted_at')
  })

  get url() {
    return `/uploads/${this.key}`
  }

  get isImage() {
    return this.mimeType.startsWith('image/')
  }

  get displayTitle() {
    return this.title || this.filename
  }

  get srcset() {
    return this.variants.map((variant) => `/uploads/${variant.key} ${variant.width}w`).join(', ')
  }

  get searchDocument() {
    return {
      id: this.id,
      title: this.displayTitle,
      body: [this.filename, this.alt, this.caption, this.description, this.folder]
        .filter(Boolean)
        .join('\n'),
    }
  }

  @afterSave()
  static async syncSearch(asset: Asset) {
    if (asset.deletedAt) await unindexSearch('asset', asset.id)
    else await indexSearchDocument('asset', asset.searchDocument)
  }

  @afterDelete()
  static async dropSearch(asset: Asset) {
    await unindexSearch('asset', asset.id)
  }
}
