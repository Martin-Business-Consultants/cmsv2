import { useSyncExternalStore } from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'
import { cn } from '~/lib/utils'

export type Appearance = 'light' | 'dark' | 'system'

const KEY = 'appearance'

declare global {
  interface Window {
    applyAppearance?: () => void
  }
}

function defaultAppearance(): Appearance {
  const fallback = document.documentElement.dataset.defaultTheme
  return fallback === 'light' || fallback === 'dark' ? fallback : 'system'
}

function readAppearance(): Appearance {
  try {
    const stored = window.localStorage.getItem(KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  } catch {}
  return defaultAppearance()
}

function isDark() {
  return document.documentElement.classList.contains('dark')
}

function apply(theme: Appearance) {
  try {
    window.localStorage.setItem(KEY, theme)
  } catch {}
  const run = () => {
    if (window.applyAppearance) {
      window.applyAppearance()
      return
    }
    const dark =
      theme === 'dark' ||
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    document.documentElement.classList.toggle('dark', dark)
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
    document.documentElement.dataset.appearance = theme
  }
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const transition = (document as Document & { startViewTransition?: (cb: () => void) => void })
    .startViewTransition
  if (transition && !reduced) transition.call(document, run)
  else run()
}

function subscribe(callback: () => void) {
  const observer = new MutationObserver(callback)
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class', 'data-appearance'],
  })
  window.addEventListener('storage', callback)
  return () => {
    observer.disconnect()
    window.removeEventListener('storage', callback)
  }
}

export function useAppearance() {
  const appearance = useSyncExternalStore<Appearance>(subscribe, readAppearance, () => 'system')
  const dark = useSyncExternalStore(subscribe, isDark, () => false)

  return { appearance, dark, choose: apply }
}

export default function ThemeToggle({ className }: { className?: string }) {
  const { dark, choose } = useAppearance()
  const label = 'Switch between light and dark'

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn('size-8', className)}
          onClick={() => choose(dark ? 'light' : 'dark')}
          aria-label={label}
        >
          {dark ? <Sun /> : <Moon />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

const CHOICES: { value: Appearance; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]

export function AppearancePicker() {
  const { appearance, choose } = useAppearance()

  return (
    <div role="radiogroup" aria-label="Appearance" className="grid gap-3 sm:grid-cols-3">
      {CHOICES.map(({ value, label, icon: ChoiceIcon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={appearance === value}
          onClick={() => choose(value)}
          className={cn(
            'flex flex-col items-center gap-1.5 rounded-lg border px-4 py-3 text-sm font-medium transition-colors',
            appearance === value
              ? 'border-primary bg-primary/5 ring-primary/30 ring-2'
              : 'hover:bg-accent'
          )}
        >
          <ChoiceIcon className="size-5" />
          {label}
        </button>
      ))}
    </div>
  )
}
