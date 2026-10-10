export const LINE_DIFF_THRESHOLD = 120
export const CONTEXT = 3

const OBJECT_FIELDS = ['frontmatter', 'seo', 'data']
const RICH_FIELDS = ['body']

export type DiffLine = { op: 'eq' | 'add' | 'del'; text: string } | { op: 'skip'; count: number }

export type DiffEntry = {
  key: string
  op: 'added' | 'removed' | 'changed'
  before: string | null
  after: string | null
}

export type BlockOp = 'added' | 'removed' | 'moved' | 'changed' | 'changed_and_moved' | 'unchanged'

export type BlockRow = {
  op: BlockOp
  type: string | null
  id: string | null
  index: number
  fromIndex?: number
  fields: DiffEntry[]
}

export type DiffField =
  | { key: string; kind: 'text'; before: string; after: string }
  | { key: string; kind: 'lines'; lines: DiffLine[] }
  | { key: string; kind: 'object'; entries: DiffEntry[] }
  | { key: string; kind: 'blocks'; blocks: BlockRow[] }

export type ContentDiffResult = { fields: DiffField[] }

type Json = Record<string, any>

function isObject(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function normalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalize)
  if (isObject(value)) {
    return Object.fromEntries(
      Object.keys(value)
        .filter((key) => value[key] !== undefined)
        .sort()
        .map((key) => [key, normalize(value[key])])
    )
  }
  return value
}

export function same(a: unknown, b: unknown) {
  return JSON.stringify(normalize(a ?? null)) === JSON.stringify(normalize(b ?? null))
}

function isRichText(value: unknown): value is { type: 'doc'; content?: Json[] } {
  return isObject(value) && value.type === 'doc'
}

function inlineText(node: Json): string {
  if (node.type === 'text') return String(node.text ?? '')
  if (node.type === 'hardBreak') return '\n'
  if (node.type === 'image') return `[image: ${node.attrs?.alt || node.attrs?.src || ''}]`
  return (node.content ?? []).map(inlineText).join('')
}

export function richTextLines(doc: unknown): string {
  if (!isRichText(doc)) return ''
  const lines: string[] = []
  const walk = (nodes: Json[], prefix = '') => {
    for (const node of nodes ?? []) {
      switch (node.type) {
        case 'heading':
          lines.push(`${'#'.repeat(node.attrs?.level ?? 2)} ${inlineText(node)}`)
          break
        case 'bulletList':
        case 'orderedList': {
          const items: Json[] = node.content ?? []
          items.forEach((item, index) =>
            walk(item.content ?? [], node.type === 'orderedList' ? `${index + 1}. ` : '- ')
          )
          break
        }
        case 'blockquote':
          walk(node.content ?? [], '> ')
          break
        case 'codeBlock':
          lines.push('```', ...inlineText(node).split('\n'), '```')
          break
        case 'horizontalRule':
          lines.push('---')
          break
        default:
          lines.push(`${prefix}${inlineText(node)}`)
      }
    }
  }
  walk(doc.content ?? [])
  return lines.join('\n')
}

function renderValue(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') return value
  if (isRichText(value)) return richTextLines(value)
  return JSON.stringify(normalize(value), null, 2)
}

function objectDiff(before: unknown, after: unknown): DiffEntry[] {
  const b = (normalize(before ?? {}) ?? {}) as Json
  const a = (normalize(after ?? {}) ?? {}) as Json
  if (!isObject(b) || !isObject(a)) return []
  const keys = [...new Set([...Object.keys(b), ...Object.keys(a)])].sort()
  const entries: DiffEntry[] = []
  for (const key of keys) {
    if (same(b[key], a[key])) continue
    const op = !(key in b) ? 'added' : !(key in a) ? 'removed' : 'changed'
    entries.push({ key, op, before: renderValue(b[key]), after: renderValue(a[key]) })
  }
  return entries
}

function blank(value: unknown) {
  return value === null || value === undefined || value === ''
}

function positionalMatch(before: Json[], after: Json[], afterIndex: number, used: Set<number>) {
  const type = after[afterIndex]?.type
  const index = before.findIndex(
    (block, i) => !used.has(i) && block?.type === type && blank(block?.id)
  )
  return index === -1 ? null : index
}

function blockDiff(beforeValue: unknown, afterValue: unknown): BlockRow[] {
  const before = (Array.isArray(beforeValue) ? beforeValue : []).map((b) => normalize(b) as Json)
  const after = (Array.isArray(afterValue) ? afterValue : []).map((b) => normalize(b) as Json)
  const byId = new Map<string, number>()
  before.forEach((block, index) => {
    if (!blank(block?.id) && !byId.has(String(block.id))) byId.set(String(block.id), index)
  })
  const used = new Set<number>()
  const rows: BlockRow[] = []

  after.forEach((afterBlock, afterIndex) => {
    let beforeIndex: number | null = blank(afterBlock?.id)
      ? null
      : (byId.get(String(afterBlock.id)) ?? null)
    if (beforeIndex !== null && used.has(beforeIndex)) beforeIndex = null
    beforeIndex ??= positionalMatch(before, after, afterIndex, used)

    const type = afterBlock?.type ?? null
    const id = blank(afterBlock?.id) ? null : String(afterBlock.id)
    if (beforeIndex === null) {
      rows.push({ op: 'added', type, id, index: afterIndex, fields: [] })
      return
    }
    used.add(beforeIndex)
    const fields = objectDiff(before[beforeIndex]?.data, afterBlock?.data)
    const moved = beforeIndex !== afterIndex
    const op: BlockOp =
      fields.length && moved
        ? 'changed_and_moved'
        : fields.length
          ? 'changed'
          : moved
            ? 'moved'
            : 'unchanged'
    rows.push({ op, type, id, index: afterIndex, fromIndex: beforeIndex, fields })
  })

  before.forEach((block, index) => {
    if (used.has(index)) return
    rows.push({
      op: 'removed',
      type: block?.type ?? null,
      id: blank(block?.id) ? null : String(block.id),
      index,
      fields: [],
    })
  })
  return rows
}

function lcsTable(b: string[], a: string[]) {
  const table = Array.from({ length: b.length + 1 }, () => new Array<number>(a.length + 1).fill(0))
  b.forEach((before, i) => {
    a.forEach((after, j) => {
      table[i + 1][j + 1] =
        before === after ? table[i][j] + 1 : Math.max(table[i][j + 1], table[i + 1][j])
    })
  })
  return table
}

function collapseContext(rows: DiffLine[]): DiffLine[] {
  const keep = new Array<boolean>(rows.length).fill(false)
  rows.forEach((row, index) => {
    if (row.op === 'eq') return
    const from = Math.max(index - CONTEXT, 0)
    const to = Math.min(index + CONTEXT, rows.length - 1)
    for (let i = from; i <= to; i++) keep[i] = true
  })
  const out: DiffLine[] = []
  let skipped = 0
  rows.forEach((row, index) => {
    if (keep[index]) {
      if (skipped) out.push({ op: 'skip', count: skipped })
      skipped = 0
      out.push(row)
    } else {
      skipped++
    }
  })
  if (skipped) out.push({ op: 'skip', count: skipped })
  return out
}

export function lineDiff(before: string, after: string): DiffLine[] {
  const b = before.split('\n')
  const a = after.split('\n')
  const lcs = lcsTable(b, a)
  const rows: DiffLine[] = []
  let i = b.length
  let j = a.length
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && b[i - 1] === a[j - 1]) {
      rows.push({ op: 'eq', text: b[i - 1] })
      i--
      j--
    } else if (j > 0 && (i === 0 || lcs[i][j - 1] >= lcs[i - 1][j])) {
      rows.push({ op: 'add', text: a[j - 1] })
      j--
    } else {
      rows.push({ op: 'del', text: b[i - 1] })
      i--
    }
  }
  return collapseContext(rows.reverse())
}

function scalarDiff(key: string, before: unknown, after: unknown): DiffField {
  const b = before === null || before === undefined ? '' : String(before)
  const a = after === null || after === undefined ? '' : String(after)
  if (
    b.includes('\n') ||
    a.includes('\n') ||
    b.length > LINE_DIFF_THRESHOLD ||
    a.length > LINE_DIFF_THRESHOLD
  ) {
    return { key, kind: 'lines', lines: lineDiff(b, a) }
  }
  return { key, kind: 'text', before: b, after: a }
}

function fieldDiff(key: string, before: unknown, after: unknown): DiffField {
  if (key === 'blocks') return { key, kind: 'blocks', blocks: blockDiff(before, after) }
  if (OBJECT_FIELDS.includes(key))
    return { key, kind: 'object', entries: objectDiff(before, after) }
  if (RICH_FIELDS.includes(key) || isRichText(before) || isRichText(after)) {
    return scalarDiff(key, renderValue(before) ?? '', renderValue(after) ?? '')
  }
  return scalarDiff(key, before, after)
}

export function contentDiff(payload: Json, base: Json): ContentDiffResult {
  return {
    fields: Object.keys(payload)
      .sort()
      .map((key) => fieldDiff(key, base[key], payload[key])),
  }
}

export function changesFromCurrent(snapshot: Json, current: Json): ContentDiffResult {
  const changed: Json = {}
  for (const [key, value] of Object.entries(snapshot)) {
    if (!same(value, current[key])) changed[key] = value
  }
  return contentDiff(changed, current)
}

export function changedKeys(snapshot: Json, current: Json) {
  return Object.keys(snapshot)
    .filter((key) => !same(snapshot[key], current[key]))
    .sort()
}
