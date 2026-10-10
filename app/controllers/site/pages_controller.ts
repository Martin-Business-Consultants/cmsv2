import type { HttpContext } from '@adonisjs/core/http'
import { getSettings } from '#services/settings'
import { entryProps, matchRedirect, notFoundProps, pageProps, resolvePath } from '#services/site'

export default class PagesController {
  async show({ request, response, inertia }: HttpContext) {
    const path = request.url()
    if (path === '/api' || path.startsWith('/api/'))
      return response.notFound({ error: 'not_found', message: 'Not Found' })
    const redirect = await matchRedirect(path)
    if (redirect)
      return response.redirect().status(redirect.statusCode).toPath(redirect.destination)

    const settings = await getSettings()
    const view = { headScripts: settings.headScripts }
    const resolved = await resolvePath(path, settings)

    if (resolved?.kind === 'page') {
      const props = await pageProps(resolved.page, { live: true })
      return inertia.render('site/page', props, { ...view, lang: props.seo.lang })
    }
    if (resolved?.kind === 'entry') {
      const props = await entryProps(resolved.entry, { live: true })
      return inertia.render('site/entry', props, { ...view, lang: props.seo.lang })
    }

    response.status(404)
    return inertia.render('site/not_found', await notFoundProps(), view)
  }
}
