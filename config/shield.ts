import app from '@adonisjs/core/services/app'
import { defineConfig } from '@adonisjs/shield'
import env from '#start/env'
const CAPTCHA_SCRIPT_SOURCES = [
  'https://challenges.cloudflare.com',
  'https://www.google.com',
  'https://www.gstatic.com',
]

const CAPTCHA_FRAME_SOURCES = [
  'https://challenges.cloudflare.com',
  'https://www.google.com',
  'https://recaptcha.google.com',
]

const CAPTCHA_CONNECT_SOURCES = ['https://challenges.cloudflare.com', 'https://www.google.com']

const FONT_STYLE_SOURCES = ['https://fonts.googleapis.com']

const FONT_SOURCES = ['https://fonts.gstatic.com']

const development = !app.inProduction

const shieldConfig = defineConfig({
  csp: {
    enabled: env.get('CMS_CSP', 'on') !== 'off',

    directives: {
      defaultSrc: [`'self'`],
      baseUri: [`'self'`],
      objectSrc: [`'none'`],
      frameAncestors: [`'none'`],
      scriptSrc: [`'self'`, '@nonce', ...CAPTCHA_SCRIPT_SOURCES, '@headScriptSources'],
      scriptSrcAttr: [`'none'`],
      styleSrc: [`'self'`, `'unsafe-inline'`, ...FONT_STYLE_SOURCES],
      fontSrc: [`'self'`, 'data:', ...FONT_SOURCES],
      imgSrc: [`'self'`, 'data:', 'blob:', 'https:'],
      mediaSrc: [`'self'`, 'blob:', 'https:'],
      connectSrc: [
        `'self'`,
        ...CAPTCHA_CONNECT_SOURCES,
        '@headScriptSources',
        ...(development ? ['ws:', 'wss:'] : []),
      ],
      frameSrc: [`'self'`, ...CAPTCHA_FRAME_SOURCES],
      workerSrc: [`'self'`, 'blob:'],
      manifestSrc: [`'self'`],
      ...(development ? {} : { upgradeInsecureRequests: [] }),
    },

    reportOnly: env.get('CMS_CSP', 'on') === 'report-only',
  },

  csrf: {
    enabled: true,

    exceptRoutes: (ctx) =>
      Boolean(ctx.route?.name?.startsWith('public.')) ||
      (ctx.request.url().startsWith('/api/') &&
        (ctx.request.header('authorization') ?? '').startsWith('Bearer ')),

    enableXsrfCookie: true,

    methods: ['POST', 'PUT', 'PATCH', 'DELETE'],
  },

  xFrame: {
    enabled: true,

    action: 'DENY',
  },

  hsts: {
    enabled: true,

    maxAge: '180 days',
  },

  contentTypeSniffing: {
    enabled: true,
  },
})

export default shieldConfig
