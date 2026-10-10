export type Errors = Record<string, string | string[] | undefined>

export function errorAt(errors: Errors | undefined, path: string) {
  const value = errors?.[path]
  return Array.isArray(value) ? value[0] : value
}

export function errorsUnder(errors: Errors | undefined, path: string) {
  if (!errors) return []
  return Object.keys(errors).filter((key) => key === path || key.startsWith(`${path}.`))
}
