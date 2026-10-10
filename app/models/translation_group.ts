import { TranslationGroupSchema } from '#database/schema'

export type TranslationKind = 'page' | 'entry'

export default class TranslationGroup extends TranslationGroupSchema {
  declare kind: TranslationKind
}
