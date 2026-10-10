import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import { renderToHTMLString } from '@tiptap/static-renderer/pm/html-string'
import type { RichTextDoc } from '#types/content'

const extensions = [
  StarterKit.configure({
    link: { openOnClick: false, HTMLAttributes: { target: null, rel: null } },
  }),
  Image,
]

export function isRichTextDoc(value: unknown): value is RichTextDoc {
  return typeof value === 'object' && value !== null && (value as RichTextDoc).type === 'doc'
}

export function richTextIsEmpty(value: unknown) {
  if (!isRichTextDoc(value)) return true
  const text = JSON.stringify(value.content ?? [])
  return !/"text":"[^"]*\S/.test(text) && !text.includes('"type":"image"')
}

export function renderRichText(value: unknown) {
  if (!isRichTextDoc(value)) return ''
  try {
    return renderToHTMLString({ extensions, content: value })
  } catch {
    return ''
  }
}

export function richTextIsRenderable(value: unknown) {
  if (!isRichTextDoc(value)) return false
  try {
    renderToHTMLString({ extensions, content: value })
    return true
  } catch {
    return false
  }
}
