import { errors } from '@vinejs/vine'
import { DateTime } from 'luxon'
import { plugins } from '#services/plugins'
import { isRichTextDoc, richTextIsEmpty, richTextIsRenderable } from '#services/rich_text'
import {
  CODE_LANGUAGES,
  FIELD_TYPES,
  SHOW_IF_COMPARATORS,
  normalizeDefinitions,
  showIfMet,
  type Block,
  type Field,
  type FieldData,
} from '#types/content'

export { normalizeDefinitions }

export type FieldError = { field: string; message: string; rule: string }

const NAME_FORMAT = /^[a-z][a-z0-9_]*$/
const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const INTEGER_FORMAT = /^\s*-?\d+\s*$/
const MAX_DEPTH = 4

export type BlockTypeLookup = Map<string, { fields: Field[]; label: string; version?: number }>

function isBlank(value: unknown) {
  return (
    value === undefined ||
    value === null ||
    value === '' ||
    (Array.isArray(value) && value.length === 0)
  )
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isPrimitive(value: unknown) {
  return ['string', 'number', 'boolean'].includes(typeof value)
}

function validateShowIf(rule: unknown, at: string): FieldError[] {
  const fail = (message: string) => [{ field: `${at}.showIf`, message, rule: 'showIf' }]
  if (!isObject(rule))
    return fail('Show if must be a JSON object like {"field": "kind", "equals": "video"}')
  if (typeof rule.field !== 'string' || !rule.field)
    return fail('Show if needs a "field" to compare')
  const set = SHOW_IF_COMPARATORS.filter((key) => key in rule)
  if (set.length === 0) return fail(`Show if needs one of ${SHOW_IF_COMPARATORS.join(', ')}`)
  if (set.length > 1) return fail(`Show if can only use one of ${SHOW_IF_COMPARATORS.join(', ')}`)
  const value = rule[set[0]]
  if ((set[0] === 'equals' || set[0] === 'not_equals') && !isPrimitive(value)) {
    return fail(`Show if "${set[0]}" must be a string, number or boolean`)
  }
  if (
    (set[0] === 'in' || set[0] === 'not_in') &&
    (!Array.isArray(value) || value.length === 0 || !value.every(isPrimitive))
  ) {
    return fail(`Show if "${set[0]}" must be a non-empty list of strings, numbers or booleans`)
  }
  return []
}

export function validateDefinitions(
  fields: unknown,
  path = 'fields',
  depth = 0,
  options: { allowBlocks?: boolean } = {}
): FieldError[] {
  const out: FieldError[] = []
  if (!Array.isArray(fields)) {
    return [{ field: path, message: 'Fields must be a list', rule: 'array' }]
  }
  if (depth > MAX_DEPTH) {
    return [{ field: path, message: `Fields can nest at most ${MAX_DEPTH} levels`, rule: 'depth' }]
  }

  const seen = new Set<string>()
  fields.forEach((field, index) => {
    const at = `${path}.${index}`
    if (!isObject(field)) {
      out.push({ field: at, message: 'Each field must be an object', rule: 'object' })
      return
    }
    const name = String(field.name ?? '')
    if (!NAME_FORMAT.test(name)) {
      out.push({
        field: `${at}.name`,
        message: 'Use lowercase letters, numbers and underscores, starting with a letter',
        rule: 'regex',
      })
    } else if (seen.has(name)) {
      out.push({ field: `${at}.name`, message: `"${name}" is used twice`, rule: 'unique' })
    }
    seen.add(name)

    if (!FIELD_TYPES.includes(field.type as never) && !plugins.fieldType(String(field.type))) {
      out.push({ field: `${at}.type`, message: 'Pick a field type', rule: 'enum' })
      return
    }
    if (field.type === 'blocks' && options.allowBlocks === false) {
      out.push({ field: `${at}.type`, message: 'Blocks can’t be used here', rule: 'enum' })
    }
    if (field.type === 'select') {
      const choices = field.options
      if (!Array.isArray(choices) || choices.filter(Boolean).length === 0) {
        out.push({ field: `${at}.options`, message: 'Add at least one option', rule: 'required' })
      }
    }
    if (
      (field.type === 'entry' || field.type === 'record_refs') &&
      field.collection !== undefined &&
      typeof field.collection !== 'string'
    ) {
      out.push({ field: `${at}.collection`, message: 'Pick a collection', rule: 'string' })
    }
    if (
      field.type === 'code' &&
      field.language !== undefined &&
      !CODE_LANGUAGES.some((language) => language.value === field.language)
    ) {
      out.push({ field: `${at}.language`, message: 'Pick a language', rule: 'enum' })
    }
    if (field.tab !== undefined && typeof field.tab !== 'string') {
      out.push({ field: `${at}.tab`, message: 'The tab must be text', rule: 'string' })
    }
    if (field.showIf !== undefined) out.push(...validateShowIf(field.showIf, at))
    if (field.type === 'repeater' || field.type === 'group') {
      if (!Array.isArray(field.of) || field.of.length === 0) {
        out.push({ field: `${at}.of`, message: 'Add at least one sub-field', rule: 'required' })
      } else {
        out.push(...validateDefinitions(field.of, `${at}.of`, depth + 1, options))
      }
    }
  })
  return out
}

function isEntryId(value: unknown) {
  return Number.isInteger(value) && (value as number) > 0
}

export function validateData(
  fields: Field[],
  data: unknown,
  blockTypes: BlockTypeLookup,
  path = 'data'
): FieldError[] {
  const out: FieldError[] = []
  const values = isObject(data) ? data : {}

  for (const field of fields) {
    if (!showIfMet(field.showIf, values)) continue
    const at = `${path}.${field.name}`
    const value = values[field.name]
    const label = field.label || field.name

    if (isBlank(value) || (field.type === 'richtext' && richTextIsEmpty(value))) {
      if (field.required) out.push({ field: at, message: `${label} is required`, rule: 'required' })
      continue
    }

    const fail = (message: string, rule: string) => out.push({ field: at, message, rule })

    switch (field.type) {
      case 'string':
      case 'text':
      case 'markdown':
        if (typeof value !== 'string') fail(`${label} must be text`, 'string')
        break
      case 'code':
        if (typeof value !== 'string') fail(`${label} must be text`, 'string')
        else if (field.language === 'json') {
          try {
            JSON.parse(value)
          } catch (error) {
            fail(`${label} isn't valid JSON: ${(error as Error).message}`, 'json')
          }
        }
        break
      case 'richtext':
        if (!isRichTextDoc(value) || !richTextIsRenderable(value)) {
          fail(`${label} contains content the editor doesn't support`, 'richtext')
        }
        break
      case 'url':
        if (typeof value !== 'string' || !/^(https?:\/\/|\/|mailto:|tel:|#)/.test(value)) {
          fail(`${label} must be a URL or a path starting with /`, 'url')
        }
        break
      case 'email':
        if (typeof value !== 'string' || !EMAIL_FORMAT.test(value)) {
          fail(`${label} must be an email address`, 'email')
        }
        break
      case 'integer':
        if (!Number.isInteger(value)) fail(`${label} must be a whole number`, 'integer')
        break
      case 'boolean':
        if (typeof value !== 'boolean') fail(`${label} must be on or off`, 'boolean')
        break
      case 'select':
        if (!field.options?.includes(String(value))) {
          fail(`${label} must be one of: ${field.options?.join(', ')}`, 'enum')
        }
        break
      case 'datetime':
        if (typeof value !== 'string' || !DateTime.fromISO(value).isValid) {
          fail(`${label} must be a date`, 'date')
        }
        break
      case 'link':
        if (
          !isObject(value) ||
          !['url', 'page', 'entry'].includes(String(value.kind)) ||
          (field.required && isBlank(value.value))
        ) {
          fail(`${label} must be a link`, 'link')
        }
        break
      case 'asset':
      case 'entry':
        if (!Number.isInteger(value)) fail(`${label} must be picked from the list`, 'reference')
        break
      case 'record_refs':
        if (!Array.isArray(value) || !value.every(isEntryId)) {
          fail(`${label} must be a list of entries`, 'reference')
        }
        break
      case 'string_list':
        if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
          fail(`${label} must be a list of text`, 'array')
        }
        break
      case 'group':
        if (!isObject(value)) fail(`${label} must be a group of fields`, 'object')
        else out.push(...validateData(field.of ?? [], value, blockTypes, at))
        break
      case 'repeater':
        if (!Array.isArray(value)) fail(`${label} must be a list`, 'array')
        else {
          value.forEach((item, index) => {
            out.push(...validateData(field.of ?? [], item, blockTypes, `${at}.${index}`))
          })
        }
        break
      case 'blocks':
        out.push(...validateBlocks(value, blockTypes, at, field.allowedTypes))
        break
      default: {
        const definition = plugins.fieldType(field.type)
        if (!definition) break
        const message = definition.validate?.(value, field)
        if (message) fail(`${label} ${message}`, field.type)
      }
    }
  }
  return out
}

export function validateBlocks(
  blocks: unknown,
  blockTypes: BlockTypeLookup,
  path = 'blocks',
  allowedTypes?: string[]
): FieldError[] {
  if (!Array.isArray(blocks)) {
    return [{ field: path, message: 'Blocks must be a list', rule: 'array' }]
  }
  const out: FieldError[] = []
  blocks.forEach((block: Block, index) => {
    const at = `${path}.${index}`
    const type = blockTypes.get(block?.type)
    if (!type) {
      out.push({ field: at, message: `Unknown block type "${block?.type}"`, rule: 'enum' })
      return
    }
    if (allowedTypes?.length && !allowedTypes.includes(block.type)) {
      out.push({ field: at, message: `${type.label} isn't allowed here`, rule: 'enum' })
      return
    }
    out.push(...validateData(type.fields, block.data, blockTypes, `${at}.data`))
  })
  return out
}

function toInteger(value: unknown) {
  if (typeof value === 'string' && INTEGER_FORMAT.test(value)) return Number.parseInt(value, 10)
  if (typeof value === 'string' && value.trim() === '') return null
  return value
}

function toBoolean(value: unknown) {
  if (typeof value === 'boolean') return value
  if (value === 1 || value === '1' || String(value).toLowerCase() === 'true' || value === 'on') {
    return true
  }
  if (value === 0 || value === '0' || value === '' || ['false', 'off'].includes(String(value))) {
    return false
  }
  return value
}

export function coerceData(fields: Field[], data: unknown, blockTypes: BlockTypeLookup): FieldData {
  if (!isObject(data)) return (data ?? {}) as FieldData
  const result: FieldData = { ...data }
  for (const field of fields) {
    const value = result[field.name]
    if (value === undefined || value === null) continue
    switch (field.type) {
      case 'string':
      case 'text':
      case 'markdown':
      case 'code':
      case 'url':
      case 'email':
      case 'select':
        if (typeof value === 'number' || typeof value === 'boolean') {
          result[field.name] = String(value)
        }
        break
      case 'integer':
        result[field.name] = toInteger(value)
        break
      case 'boolean':
        result[field.name] = toBoolean(value)
        break
      case 'asset':
      case 'entry':
        result[field.name] = toInteger(value)
        break
      case 'record_refs':
        if (Array.isArray(value)) result[field.name] = value.map(toInteger)
        break
      case 'string_list':
        if (Array.isArray(value)) {
          result[field.name] = value
            .filter((item) => item !== null && item !== undefined)
            .map((item) => (typeof item === 'string' ? item : String(item)))
        }
        break
      case 'group':
        result[field.name] = coerceData(field.of ?? [], value, blockTypes)
        break
      case 'repeater':
        if (Array.isArray(value)) {
          result[field.name] = value.map((item) => coerceData(field.of ?? [], item, blockTypes))
        }
        break
      case 'blocks':
        result[field.name] = coerceBlocks(value, blockTypes)
        break
    }
  }
  return result
}

export function coerceBlocks(blocks: unknown, blockTypes: BlockTypeLookup) {
  if (!Array.isArray(blocks)) return blocks as Block[]
  return blocks.map((block: Block) => {
    const type = isObject(block) ? blockTypes.get(block.type) : undefined
    if (!type) return block
    return { ...block, data: coerceData(type.fields, block.data, blockTypes) }
  })
}

export function assertValid(fieldErrors: FieldError[]) {
  if (fieldErrors.length) {
    throw new errors.E_VALIDATION_ERROR(fieldErrors)
  }
}

export function defaultsFor(fields: Field[]): FieldData {
  const data: FieldData = {}
  for (const field of fields) {
    if (field.type === 'boolean') data[field.name] = false
    if (['repeater', 'blocks', 'string_list', 'record_refs'].includes(field.type)) {
      data[field.name] = []
    }
    if (field.type === 'group') data[field.name] = defaultsFor(field.of ?? [])
    if (field.type === 'select' && field.required) data[field.name] = field.options?.[0]
  }
  return data
}

type JsonSchema = Record<string, unknown>

export function jsonSchemaFor(fields: Field[]): JsonSchema {
  return {
    type: 'object',
    properties: Object.fromEntries(fields.map((field) => [field.name, fieldSchema(field)])),
    required: fields.filter((field) => field.required).map((field) => field.name),
    additionalProperties: false,
  }
}

function fieldSchema(field: Field): JsonSchema {
  const base: JsonSchema = { 'title': field.label || field.name, 'x-cms-type': field.type }
  if (field.help) base.description = field.help
  if (field.showIf) base['x-cms-show-if'] = field.showIf
  if (field.sidebar) base['x-cms-sidebar'] = true
  if (field.tab) base['x-cms-tab'] = field.tab
  if (field.collection) base['x-cms-collection'] = field.collection
  return { ...base, ...typeSchema(field) }
}

function typeSchema(field: Field): JsonSchema {
  switch (field.type) {
    case 'integer':
      return { type: 'integer' }
    case 'boolean':
      return { type: 'boolean' }
    case 'select':
      return { type: 'string', enum: field.options ?? [] }
    case 'datetime':
      return { type: 'string', format: 'date-time' }
    case 'email':
      return { type: 'string', format: 'email' }
    case 'url':
      return { type: 'string', format: 'uri-reference' }
    case 'code':
      return field.language
        ? { 'type': 'string', 'x-cms-language': field.language }
        : { type: 'string' }
    case 'asset':
    case 'entry':
      return { type: 'integer' }
    case 'record_refs':
      return { type: 'array', items: { type: 'integer' } }
    case 'string_list':
      return { type: 'array', items: { type: 'string' } }
    case 'richtext':
      return {
        type: 'object',
        properties: { html: { type: 'string' }, doc: { type: 'object' } },
        required: ['html', 'doc'],
      }
    case 'link':
      return {
        type: 'object',
        properties: {
          kind: { type: 'string', enum: ['url', 'page', 'entry'] },
          value: { type: 'string' },
          label: { type: 'string' },
        },
        required: ['kind', 'value'],
      }
    case 'group':
      return jsonSchemaFor(field.of ?? [])
    case 'repeater':
      return { type: 'array', items: jsonSchemaFor(field.of ?? []) }
    case 'blocks':
      return {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            type: field.allowedTypes?.length
              ? { type: 'string', enum: field.allowedTypes }
              : { type: 'string' },
            version: { type: 'integer' },
            data: { type: 'object' },
          },
          required: ['type', 'data'],
        },
      }
    default:
      return plugins.fieldType(field.type)?.jsonSchema ?? { type: 'string' }
  }
}
