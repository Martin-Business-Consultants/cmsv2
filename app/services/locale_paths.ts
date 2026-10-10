let knownDefault = 'en'

export function rememberDefaultLocale(locale: string) {
  knownDefault = locale
}

export function defaultLocaleSync() {
  return knownDefault
}

export function localizePath(path: string, locale: string | null | undefined, fallback?: string) {
  const defaultLocale = fallback ?? knownDefault
  if (!locale || locale === defaultLocale) return path
  if (path === `/${locale}` || path.startsWith(`/${locale}/`)) return path
  return path === '/' ? `/${locale}` : `/${locale}${path}`
}
