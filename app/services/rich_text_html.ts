import { marked } from 'marked'
import type { RichTextDoc } from '#types/content'

type Element = { tag: string; attrs: Record<string, string>; children: Node[] }
type Node = Element | string
type Mark = { type: string; attrs?: Record<string, unknown> }
type JsonNode = {
  type: string
  attrs?: Record<string, unknown>
  content?: JsonNode[]
  text?: string
  marks?: Mark[]
}

const VOID = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'source',
  'track',
  'wbr',
])

const SKIPPED = new Set(['script', 'style', 'head', 'title', 'template', 'noscript', 'iframe'])

const BLOCK = new Set([
  'p',
  'div',
  'section',
  'article',
  'header',
  'footer',
  'main',
  'aside',
  'nav',
  'figure',
  'figcaption',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'ul',
  'ol',
  'li',
  'blockquote',
  'pre',
  'hr',
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'td',
  'th',
  'dl',
  'dt',
  'dd',
  'address',
  'body',
  'html',
])

const MARKS: Record<string, string> = {
  strong: 'bold',
  b: 'bold',
  em: 'italic',
  i: 'italic',
  u: 'underline',
  ins: 'underline',
  s: 'strike',
  strike: 'strike',
  del: 'strike',
  code: 'code',
}

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ndash: '–',
  mdash: '—',
  hellip: '…',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
  copy: '©',
  reg: '®',
  trade: '™',
  middot: '·',
  bull: '•',
  laquo: '«',
  raquo: '»',
  euro: '€',
}

function decode(text: string) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, name: string) => {
    if (name[0] === '#') {
      const code =
        name[1] === 'x' || name[1] === 'X'
          ? Number.parseInt(name.slice(2), 16)
          : Number.parseInt(name.slice(1), 10)
      return Number.isFinite(code) && code > 0 && code < 0x110000
        ? String.fromCodePoint(code)
        : match
    }
    return ENTITIES[name.toLowerCase()] ?? match
  })
}

function parseAttributes(source: string) {
  const attrs: Record<string, string> = {}
  const pattern = /([^\s=/>"']+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g
  let match: RegExpExecArray | null
  while ((match = pattern.exec(source))) {
    attrs[match[1].toLowerCase()] = decode(match[2] ?? match[3] ?? match[4] ?? '')
  }
  return attrs
}

function parse(html: string): Element {
  const root: Element = { tag: '#root', attrs: {}, children: [] }
  const stack: Element[] = [root]
  const tag = /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<![^>]*>|<\/\s*([a-zA-Z][\w:-]*)\s*>|<([a-zA-Z][\w:-]*)((?:\s+[^\s=/>"']+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>/g
  let last = 0
  let match: RegExpExecArray | null
  const current = () => stack[stack.length - 1]
  while ((match = tag.exec(html))) {
    if (match.index > last) current().children.push(decode(html.slice(last, match.index)))
    last = tag.lastIndex
    if (match[1]) {
      const name = match[1].toLowerCase()
      const index = stack.map((element) => element.tag).lastIndexOf(name)
      if (index > 0) stack.length = index
      continue
    }
    if (!match[2]) continue
    const name = match[2].toLowerCase()
    if (name === 'p' || name === 'li') {
      const open = stack.map((element) => element.tag).lastIndexOf(name)
      const nested = stack.slice(open + 1).some((element) => ['ul', 'ol'].includes(element.tag))
      if (open > 0 && (name === 'p' || !nested)) stack.length = open
    }
    const element: Element = { tag: name, attrs: parseAttributes(match[3] ?? ''), children: [] }
    if (SKIPPED.has(name)) {
      const close = new RegExp(`</\\s*${name}\\s*>`, 'ig')
      close.lastIndex = last
      const end = close.exec(html)
      last = end ? close.lastIndex : html.length
      tag.lastIndex = last
      continue
    }
    current().children.push(element)
    if (!VOID.has(name) && !match[4]) stack.push(element)
  }
  if (last < html.length) current().children.push(decode(html.slice(last)))
  return root
}

function isElement(node: Node): node is Element {
  return typeof node !== 'string'
}

function textOf(node: Node): string {
  if (!isElement(node)) return node
  if (node.tag === 'br') return '\n'
  return node.children.map(textOf).join('')
}

function sameMarks(a: Mark[] = [], b: Mark[] = []) {
  return JSON.stringify(a) === JSON.stringify(b)
}

class Inline {
  nodes: JsonNode[] = []

  text(value: string, marks: Mark[], pre: boolean) {
    const text = pre ? value : value.replace(/[\t\n\r\f ]+/g, ' ')
    if (!text) return
    const previous = this.nodes[this.nodes.length - 1]
    if (previous?.type === 'text' && sameMarks(previous.marks, marks)) {
      previous.text += text
      return
    }
    this.nodes.push(marks.length ? { type: 'text', text, marks } : { type: 'text', text })
  }

  hardBreak() {
    this.nodes.push({ type: 'hardBreak' })
  }

  take(trim = true) {
    const nodes = this.nodes
    this.nodes = []
    if (!trim) return nodes
    while (nodes.length) {
      const first = nodes[0]
      if (first.type === 'text') first.text = first.text!.replace(/^ +/, '')
      if (first.type === 'hardBreak' || (first.type === 'text' && !first.text)) nodes.shift()
      else break
    }
    while (nodes.length) {
      const lastNode = nodes[nodes.length - 1]
      if (lastNode.type === 'text') lastNode.text = lastNode.text!.replace(/ +$/, '')
      if (lastNode.type === 'hardBreak' || (lastNode.type === 'text' && !lastNode.text)) nodes.pop()
      else break
    }
    return nodes
  }
}

function image(element: Element): JsonNode | null {
  const src = element.attrs.src
  if (!src) return null
  const attrs: Record<string, unknown> = { src }
  if (element.attrs.alt) attrs.alt = element.attrs.alt
  if (element.attrs.title) attrs.title = element.attrs.title
  return { type: 'image', attrs }
}

function linkMark(element: Element): Mark | null {
  const href = element.attrs.href
  if (!href) return null
  const attrs: Record<string, unknown> = { href }
  if (element.attrs.target) attrs.target = element.attrs.target
  if (element.attrs.rel) attrs.rel = element.attrs.rel
  return { type: 'link', attrs }
}

class Converter {
  blocks(nodes: Node[], pre = false): JsonNode[] {
    const out: JsonNode[] = []
    const inline = new Inline()
    const flush = () => {
      const content = inline.take()
      if (content.length) out.push({ type: 'paragraph', content })
    }
    for (const node of nodes) {
      if (!isElement(node)) {
        inline.text(node, [], pre)
        continue
      }
      if (node.tag === 'img') {
        flush()
        const picture = image(node)
        if (picture) out.push(picture)
        continue
      }
      if (!BLOCK.has(node.tag)) {
        this.inline(node, [], inline, out, pre)
        continue
      }
      flush()
      out.push(...this.block(node))
    }
    flush()
    return out
  }

  block(element: Element): JsonNode[] {
    const tag = element.tag
    const heading = /^h([1-6])$/.exec(tag)
    if (heading) {
      return this.textBlock(element, { type: 'heading', attrs: { level: Number(heading[1]) } })
    }
    if (tag === 'p' || tag === 'dt' || tag === 'figcaption' || tag === 'address') {
      return this.textBlock(element, { type: 'paragraph' })
    }
    if (tag === 'hr') return [{ type: 'horizontalRule' }]
    if (tag === 'pre') {
      const code = element.children.find(
        (child): child is Element => isElement(child) && child.tag === 'code'
      )
      const language = /language-([\w+-]+)/.exec(code?.attrs.class ?? element.attrs.class ?? '')
      const text = textOf(code ?? element).replace(/\n$/, '')
      return [
        {
          type: 'codeBlock',
          attrs: { language: language ? language[1] : null },
          ...(text ? { content: [{ type: 'text', text }] } : {}),
        },
      ]
    }
    if (tag === 'blockquote') {
      const content = this.blocks(element.children)
      return [{ type: 'blockquote', content: content.length ? content : [{ type: 'paragraph' }] }]
    }
    if (tag === 'ul' || tag === 'ol') {
      const items = this.listItems(element.children)
      if (!items.length) return []
      if (tag === 'ul') return [{ type: 'bulletList', content: items }]
      const start = Number.parseInt(element.attrs.start ?? '1', 10)
      return [
        {
          type: 'orderedList',
          attrs: { start: Number.isFinite(start) ? start : 1 },
          content: items,
        },
      ]
    }
    if (tag === 'li') return [this.listItem(element)]
    return this.blocks(element.children)
  }

  listItems(children: Node[]) {
    const items: JsonNode[] = []
    for (const child of children) {
      if (isElement(child) && child.tag === 'li') items.push(this.listItem(child))
      else if (isElement(child) || child.trim()) items.push(this.listItem({ tag: 'li', attrs: {}, children: [child] }))
    }
    return items
  }

  listItem(element: Element): JsonNode {
    const content = this.blocks(element.children)
    if (!content.length || content[0].type !== 'paragraph') content.unshift({ type: 'paragraph' })
    return { type: 'listItem', content }
  }

  textBlock(element: Element, shell: JsonNode): JsonNode[] {
    const inline = new Inline()
    const extra: JsonNode[] = []
    for (const child of element.children) this.inline(child, [], inline, extra, false)
    const content = inline.take()
    const node = content.length ? { ...shell, content } : shell
    return [node, ...extra]
  }

  inline(node: Node, marks: Mark[], inline: Inline, blocks: JsonNode[], pre: boolean) {
    if (!isElement(node)) {
      inline.text(node, marks, pre)
      return
    }
    if (node.tag === 'br') {
      inline.hardBreak()
      return
    }
    if (node.tag === 'img') {
      const picture = image(node)
      if (picture) blocks.push(picture)
      return
    }
    let next = marks
    const mark = MARKS[node.tag]
    if (mark && !marks.some((existing) => existing.type === mark)) next = [...marks, { type: mark }]
    if (node.tag === 'a') {
      const link = linkMark(node)
      if (link) next = [...marks.filter((existing) => existing.type !== 'link'), link]
    }
    for (const child of node.children) this.inline(child, next, inline, blocks, pre)
  }
}

export function htmlToRichText(html: string): RichTextDoc {
  const content = new Converter().blocks(parse(html).children)
  return { type: 'doc', content: content.length ? content : [{ type: 'paragraph' }] } as RichTextDoc
}

export function markdownToRichText(markdown: string): RichTextDoc {
  return htmlToRichText(marked.parse(markdown, { async: false, gfm: true }) as string)
}
