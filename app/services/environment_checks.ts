import app from '@adonisjs/core/services/app'
import env from '#start/env'

export type EnvironmentProblem = { level: 'error' | 'warning'; message: string }

export function forceHttps() {
  const configured = env.get('CMS_FORCE_SSL')
  if (configured !== undefined) return configured
  return app.inProduction && env.get('APP_URL').startsWith('https://')
}

export function environmentProblems(): EnvironmentProblem[] {
  const problems: EnvironmentProblem[] = []
  const production = app.inProduction
  const fail = (message: string) =>
    problems.push({ level: production ? 'error' : 'warning', message })
  const warn = (message: string) => problems.push({ level: 'warning', message })

  const key = env.get('APP_KEY').release()
  if (key.length < 32) fail('APP_KEY must be at least 32 characters (node ace generate:key)')

  let url: URL | null = null
  try {
    url = new URL(env.get('APP_URL'))
  } catch {
    fail('APP_URL must be a full URL such as https://cms.example.com')
  }
  if (url && production) {
    if (url.protocol !== 'https:' && env.get('CMS_FORCE_SSL') !== false) {
      fail('APP_URL must use https:// in production (set CMS_FORCE_SSL=false for plain HTTP)')
    }
    if (['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(url.hostname)) {
      warn(`APP_URL points at ${url.hostname}; links in emails and webhooks will not work`)
    }
  }
  if (production && env.get('CMS_ALLOW_PRIVATE_WEBHOOKS')) {
    warn('CMS_ALLOW_PRIVATE_WEBHOOKS is on: webhooks may reach private network addresses')
  }
  if (production && env.get('SESSION_DRIVER') === 'memory') {
    warn('SESSION_DRIVER=memory signs everyone out on every restart')
  }
  if (production && env.get('LIMITER_STORE') === 'memory') {
    warn('LIMITER_STORE=memory resets rate limits on every restart')
  }
  if (production && env.get('CMS_CSP', 'on') === 'off') {
    warn('CMS_CSP=off disables the Content-Security-Policy header')
  }
  return problems
}
