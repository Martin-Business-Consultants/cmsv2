import { type SchemaRules } from '@adonisjs/lucid/types/schema_generator'

const json = {
  tsType: 'any',
  imports: [],
  decorator:
    "@column({ prepare: (value: unknown) => JSON.stringify(value ?? null), consume: (value: unknown) => { if (typeof value !== 'string') return value; try { return JSON.parse(value) } catch { return null } } })",
}

export default {
  types: {
    json,
    jsonb: json,
    boolean: {
      tsType: 'boolean',
      imports: [],
      decorator: '@column({ consume: (value: unknown) => Boolean(value) })',
    },
  },
} satisfies SchemaRules
