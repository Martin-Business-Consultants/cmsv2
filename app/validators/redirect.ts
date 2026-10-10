import vine, { SimpleMessagesProvider } from '@vinejs/vine'

export const REDIRECT_STATUS_CODES = [301, 302, 307, 308] as const

const sourcePattern = /^\/(?:[^\s?#*]*[^\s?#*/])?(?:\/\*)?$/
const reservedPattern = /^\/(?:admin|api)(?:[/*]|$)/
const destinationPattern = /^(?:\/[^\s]*|https?:\/\/[^\s/]+[^\s]*)$/

const splatRule = vine.createRule((value, _, field) => {
  if (typeof value !== 'string' || !value.includes(':splat')) return
  const source = (field.parent as { source?: unknown }).source
  if (typeof source !== 'string' || !source.endsWith('/*')) {
    field.report('Only a wildcard source (ending in /*) can use :splat', 'splat', field)
  }
})

const reservedRule = vine.createRule((value, _, field) => {
  if (typeof value === 'string' && reservedPattern.test(value)) {
    field.report('Paths under /admin and /api cannot be redirected', 'reserved', field)
  }
})

export const redirectValidator = vine.withMetaData<{ id?: number }>().create({
  source: vine
    .string()
    .trim()
    .maxLength(500)
    .regex(sourcePattern)
    .use(reservedRule())
    .unique({
      table: 'redirects',
      column: 'source',
      filter: (query, _, field) => {
        if (field.meta.id) query.whereNot('id', field.meta.id)
      },
    }),
  destination: vine.string().trim().maxLength(2000).regex(destinationPattern).use(splatRule()),
  statusCode: vine.number().in([...REDIRECT_STATUS_CODES]),
  isActive: vine.boolean(),
  notes: vine.string().trim().maxLength(1000).nullable().optional(),
})

redirectValidator.messagesProvider = new SimpleMessagesProvider({
  'required': 'This field is required',
  'source.required': 'Enter the path to redirect from',
  'source.regex': 'Start with / and use no spaces, query strings or * (except a trailing /*)',
  'source.database.unique': 'A redirect from this path already exists',
  'destination.required': 'Enter where to send visitors',
  'destination.regex': 'Enter a path starting with / or a full http(s):// URL',
  'statusCode.in': 'Choose 301, 302, 307 or 308',
})
