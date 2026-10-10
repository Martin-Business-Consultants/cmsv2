import { Marked, type Tokens } from 'marked'

const SAFE_URL = /^(https?:|mailto:|tel:|\/|#|\.{0,2}\/|[^:]*$)/i

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function safeUrl(href: string) {
  const value = href.trim()
  return SAFE_URL.test(value) ? value : '#'
}

const markdown = new Marked({
  gfm: true,
  breaks: false,
  async: false,
  renderer: {
    html({ text }: Tokens.HTML | Tokens.Tag) {
      return escapeHtml(text)
    },
    link({ href, title, tokens }: Tokens.Link) {
      const inner = this.parser.parseInline(tokens)
      const titleAttr = title ? ` title="${escapeHtml(title)}"` : ''
      return `<a href="${escapeHtml(safeUrl(href))}"${titleAttr}>${inner}</a>`
    },
    image({ href, title, text }: Tokens.Image) {
      const titleAttr = title ? ` title="${escapeHtml(title)}"` : ''
      return `<img src="${escapeHtml(safeUrl(href))}" alt="${escapeHtml(text)}"${titleAttr}>`
    },
  },
})

export function renderMarkdown(text: string) {
  return markdown.parse(text ?? '') as string
}
