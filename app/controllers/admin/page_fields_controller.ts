import type { HttpContext } from '@adonisjs/core/http'
import Page from '#models/page'
import { pageFieldsValidator } from '#validators/page'
import { assertValid, normalizeDefinitions, validateDefinitions } from '#services/fields'
import { editorProps } from '#services/blocks'
import { audit } from '#services/audit'

async function findPage(id: string) {
  return Page.query().where('id', id).whereNull('deleted_at').firstOrFail()
}

export default class PageFieldsController {
  async show({ inertia, params, bouncer }: HttpContext) {
    await bouncer.authorize('access', 'pages:write')
    const page = await findPage(params.id)
    const { collections } = await editorProps()

    return inertia.render('admin/pages/fields', {
      page: { id: page.id, title: page.title, path: page.path, fields: page.fields ?? [] },
      collections,
    })
  }

  async update(ctx: HttpContext) {
    const { request, response, params, bouncer, session } = ctx
    await bouncer.authorize('access', 'pages:write')
    const page = await findPage(params.id)
    const values = await request.validateUsing(pageFieldsValidator)
    const fields = normalizeDefinitions(values.fields)
    assertValid(validateDefinitions(fields, 'fields', 0, { allowBlocks: false }))

    page.fields = fields
    await page.save()
    await audit(ctx, 'page.schema_updated', page, { path: page.path })

    session.flash('success', 'Fields saved')
    return response.redirect().back()
  }
}
