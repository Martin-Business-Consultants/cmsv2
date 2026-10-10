import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import UserTransformer from '#transformers/user_transformer'
import BaseInertiaMiddleware from '@adonisjs/inertia/inertia_middleware'
import { adminMenu } from '#services/admin_menu'
import { plugins } from '#services/plugins'
import Collection from '#models/collection'
import { getSettings, siteTimeZone } from '#services/settings'
import { brandingAssets, brandingHead, getBranding } from '#services/branding'

export default class InertiaMiddleware extends BaseInertiaMiddleware {
  async share(ctx: HttpContext) {
    const { auth } = ctx as Partial<HttpContext>
    const user = auth?.use('web').user
    const admin = user && ctx.request.url().startsWith('/admin')
    const settings = admin ? await getSettings() : null
    const navigation = admin ? await adminMenu(user) : null
    const collections = admin ? await Collection.query().orderBy('name') : []
    const [brand, branding] = await Promise.all([brandingAssets(), getBranding()])
    ctx.view?.share({
      brandingHead: await brandingHead(),
      defaultAppearance: branding.defaultAppearance,
    })

    return {
      plugins: ctx.inertia.always(
        [...plugins.definitions.keys()].filter((key) => plugins.isEnabled(key))
      ),
      admin: ctx.inertia.always(
        admin
          ? {
              siteName: settings!.siteName,
              timezone: siteTimeZone(settings!),
              menu: navigation!.menu,
              newItems: navigation!.newItems,
              fieldTypes: plugins
                .enabled(plugins.fieldTypes)
                .map((definition) => ({ type: definition.type, label: definition.label })),
              collections: collections.map((collection) => ({
                id: collection.id,
                name: collection.name,
                icon: collection.icon,
              })),
            }
          : null
      ),
      brand: ctx.inertia.always({
        siteName: brand.siteName,
        logoUrl: brand.logoUrl,
        logoSmallUrl: brand.logoSmallUrl,
        faviconUrl: brand.faviconUrl,
      }),
      errors: ctx.inertia.always(this.getValidationErrors(ctx)),
      user: ctx.inertia.always(
        user ? UserTransformer.transform(user).useVariant('forSession') : undefined
      ),
    }
  }

  flash(ctx: HttpContext) {
    const { session } = ctx as Partial<HttpContext>

    const success: string | undefined = session?.flashMessages.get('success')
    const error: string | undefined = session?.flashMessages.get('error')
    const formSuccess: { form: string; message: string } | undefined =
      session?.flashMessages.get('formSuccess')

    return { success, error, formSuccess }
  }

  async handle(ctx: HttpContext, next: NextFn) {
    await this.init(ctx)

    const output = await next()
    this.dispose(ctx)

    return output
  }
}

declare module '@adonisjs/inertia/types' {
  type MiddlewareSharedProps = InferSharedProps<InertiaMiddleware>
  export interface SharedProps extends MiddlewareSharedProps {}
}
