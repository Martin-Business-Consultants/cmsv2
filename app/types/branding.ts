export const FONTS = {
  'Inter': 'Clean modern sans',
  'DM Sans': 'Geometric',
  'Manrope': 'Soft sans',
  'Playfair Display': 'Editorial serif',
  'Lora': 'Calligraphic serif',
} as const

export type BrandFont = keyof typeof FONTS

export const RADII = ['none', 'small', 'medium', 'large'] as const
export type BrandRadius = (typeof RADII)[number]

export const SHADOWS = ['none', 'small', 'medium', 'large'] as const
export type BrandShadow = (typeof SHADOWS)[number]

export const APPEARANCES = ['system', 'light', 'dark'] as const
export type Appearance = (typeof APPEARANCES)[number]

export const HEX_COLOR = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i

export const FALLBACK_STACK =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif'

export const ACCENT_STEPS: [number, (color: string) => string][] = [
  [50, (color) => `color-mix(in oklch, ${color} 8%, white)`],
  [100, (color) => `color-mix(in oklch, ${color} 16%, white)`],
  [200, (color) => `color-mix(in oklch, ${color} 30%, white)`],
  [300, (color) => `color-mix(in oklch, ${color} 50%, white)`],
  [400, (color) => `color-mix(in oklch, ${color} 72%, white)`],
  [500, (color) => `color-mix(in oklch, ${color} 88%, white)`],
  [600, (color) => color],
  [700, (color) => `color-mix(in oklch, ${color} 84%, black)`],
  [800, (color) => `color-mix(in oklch, ${color} 70%, black)`],
  [900, (color) => `color-mix(in oklch, ${color} 56%, black)`],
]

export const CORNERS: Record<BrandRadius, Record<'sm' | 'md' | 'lg' | 'xl', string>> = {
  none: { sm: '0', md: '0', lg: '0', xl: '0' },
  small: { sm: '0.125rem', md: '0.1875rem', lg: '0.25rem', xl: '0.375rem' },
  medium: { sm: '0.25rem', md: '0.375rem', lg: '0.5rem', xl: '0.75rem' },
  large: { sm: '0.375rem', md: '0.625rem', lg: '0.875rem', xl: '1.25rem' },
}

export const SHADOW_TOKENS: Record<BrandShadow, { surface: string; overlay: string }> = {
  none: { surface: '0 0 #0000', overlay: '0 0 #0000' },
  small: {
    surface: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    overlay: '0 4px 12px -2px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.06)',
  },
  medium: {
    surface: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    overlay:
      '0 0 0 1px rgb(0 0 0 / 0.04), 0 10px 16px rgb(0 0 0 / 0.08), 0 2px 6px rgb(0 0 0 / 0.12)',
  },
  large: {
    surface: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    overlay: '0 25px 50px -12px rgb(0 0 0 / 0.25), 0 8px 16px -8px rgb(0 0 0 / 0.15)',
  },
}

export type BrandingValues = {
  primaryColor: string | null
  secondaryColor: string | null
  font: BrandFont | null
  borderRadius: BrandRadius | null
  boxShadow: BrandShadow | null
  defaultAppearance: Appearance
}

export const BRAND_BRIEF_FIELDS = {
  brand_voice: {
    label: 'Voice',
    hint: 'How the writing should sound. Concrete adjectives beat abstract ones.',
  },
  audience: { label: 'Audience', hint: 'Who is reading, and what they already know.' },
  key_facts: {
    label: 'Key facts',
    hint: 'Details that must stay accurate — names, numbers, claims that can’t be invented.',
  },
  style_notes: {
    label: 'Style notes',
    hint: 'House rules. Do’s and don’ts, spellings, words to avoid.',
  },
} as const

export type BrandBriefField = keyof typeof BRAND_BRIEF_FIELDS
export type BrandBrief = Record<BrandBriefField, string>

function pick<T extends string>(list: readonly T[], value: unknown): T | null {
  return typeof value === 'string' && (list as readonly string[]).includes(value)
    ? (value as T)
    : null
}

function hex(value: unknown) {
  const color = typeof value === 'string' ? value.trim() : ''
  return HEX_COLOR.test(color) ? color : null
}

export function normalizeBranding(data: Record<string, unknown> | null | undefined) {
  const values = data ?? {}
  return {
    primaryColor: hex(values.primaryColor),
    secondaryColor: hex(values.secondaryColor),
    font: pick(Object.keys(FONTS) as BrandFont[], values.font),
    borderRadius: pick(RADII, values.borderRadius),
    boxShadow: pick(SHADOWS, values.boxShadow),
    defaultAppearance: pick(APPEARANCES, values.defaultAppearance) ?? 'system',
  } satisfies BrandingValues
}

export function isLightColor(color: string) {
  let digits = color.replace(/^#/, '')
  if (digits.length === 3) digits = [...digits].map((digit) => digit + digit).join('')
  const [red, green, blue] = [0, 2, 4]
    .map((index) => Number.parseInt(digits.slice(index, index + 2), 16) / 255)
    .map((channel) => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4))
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue > 0.45
}

export function brandingTokens(branding: BrandingValues) {
  const tokens: [string, string][] = []
  const primary = hex(branding.primaryColor)
  if (primary) {
    for (const [step, mix] of ACCENT_STEPS) tokens.push([`--accent-${step}`, mix(primary)])
    if (isLightColor(primary)) tokens.push(['--on-accent', '#1c1917'])
  }
  const secondary = hex(branding.secondaryColor)
  if (secondary) tokens.push(['--neutral-tint', secondary])
  if (branding.font && branding.font in FONTS) {
    tokens.push(['--font-sans', `"${branding.font}", ${FALLBACK_STACK}`])
  }
  if (branding.borderRadius && CORNERS[branding.borderRadius]) {
    for (const [size, value] of Object.entries(CORNERS[branding.borderRadius])) {
      tokens.push([`--radius-${size}`, value])
    }
  }
  if (branding.boxShadow && SHADOW_TOKENS[branding.boxShadow]) {
    for (const [kind, value] of Object.entries(SHADOW_TOKENS[branding.boxShadow])) {
      tokens.push([`--shadow-${kind}`, value])
    }
  }
  return tokens
}

export function brandingStylesheet(branding: BrandingValues) {
  const tokens = brandingTokens(branding)
  if (!tokens.length) return ''
  return `:root {\n${tokens.map(([name, value]) => `  ${name}: ${value};`).join('\n')}\n}\n`
}

export function isCustomized(branding: BrandingValues) {
  return Boolean(
    branding.primaryColor ||
    branding.secondaryColor ||
    branding.font ||
    branding.borderRadius ||
    branding.boxShadow
  )
}

export function googleFontUrl(font: string | null) {
  if (!font) return null
  return `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font)}:wght@400;500;600;700&display=swap`
}
