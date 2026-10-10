import type { HttpContext } from '@adonisjs/core/http'
import { renderMarkdown } from '#services/markdown'

export default class MarkdownPreviewsController {
  async store({ request }: HttpContext) {
    const text = String(request.input('text', '')).slice(0, 200_000)
    return { html: renderMarkdown(text) }
  }
}
