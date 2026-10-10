import type { InferData } from '@adonisjs/core/types/transformers'
import type AssetTransformer from '../app/transformers/asset_transformer.js'
import type { AssetUsage } from '../app/services/usage.js'
import type { FolderNode } from '../app/services/folders.js'

export type MediaAsset = InferData<AssetTransformer>

export type { AssetUsage, FolderNode }

export type LibraryFilters = { search: string; type: string; folder: string; missingAlt: boolean }

export type UploadResult = { assets: { id: number }[]; failures: string[]; folder?: string }
