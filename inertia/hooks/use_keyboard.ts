import { useEffect, useRef } from 'react'
import { router, usePage } from '@inertiajs/react'

export type GoChord = { key: string; label: string; href: string }

export const GO_CHORDS: GoChord[] = [
  { key: 'd', label: 'Dashboard', href: '/admin' },
  { key: 'h', label: 'Dashboard', href: '/admin' },
  { key: 'p', label: 'Pages', href: '/admin/pages' },
  { key: 'c', label: 'Collections', href: '/admin/collections' },
  { key: 'l', label: 'Globals', href: '/admin/globals' },
  { key: 'm', label: 'Media', href: '/admin/media' },
  { key: 'f', label: 'Forms', href: '/admin/forms' },
  { key: 'b', label: 'Block types', href: '/admin/block-types' },
  { key: 'r', label: 'Redirects', href: '/admin/redirects' },
  { key: 'u', label: 'Users', href: '/admin/users' },
  { key: 'a', label: 'Audit log', href: '/admin/audit-log' },
  { key: 't', label: 'Trash', href: '/admin/trash' },
  { key: 's', label: 'Settings', href: '/admin/settings' },
]

const ITEM = '[data-list-item]'
const TYPING = 'input, textarea, select, [contenteditable=""], [contenteditable="true"]'
const OVERLAY =
  '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"], [role="menu"][data-state="open"], [role="listbox"][data-state="open"]'
const CHORD_TIMEOUT = 1500
const CURRENT = 'data-keyboard-current'

function describe(event: KeyboardEvent) {
  let key = event.key
  if (key === 'Escape') key = 'esc'
  else if (key === ' ') key = 'space'
  else if (key.length > 1) key = key.toLowerCase()
  const modifiers: string[] = []
  if (event.ctrlKey) modifiers.push('ctrl')
  if (event.metaKey) modifiers.push('meta')
  if (event.altKey) modifiers.push('alt')
  return [...modifiers, key].join('+')
}

function usable(element: Element) {
  return (
    !element.closest('[hidden], [aria-hidden="true"], [inert]') &&
    (typeof (element as HTMLElement).checkVisibility !== 'function' ||
      (element as HTMLElement).checkVisibility())
  )
}

function items() {
  return Array.from(document.querySelectorAll<HTMLElement>(ITEM)).filter(usable)
}

function declares(element: HTMLElement, key: string) {
  return (element.dataset.keys ?? '')
    .split(',')
    .map((name) => name.trim())
    .includes(key)
}

export function parentPath(path: string) {
  const segments = path.replace(/\/+$/, '').split('/')
  if (segments.length <= 2) return null
  const last = segments.pop()!
  if (last === 'edit' || last === 'new') {
    if (/^\d+$/.test(segments.at(-1) ?? '')) segments.pop()
  } else if (/^\d+$/.test(segments.at(-1) ?? '')) {
    if (last === 'versions') segments.push('edit')
    else segments.pop()
  }
  return segments.join('/') || null
}

type ScreenKeys = (key: string) => boolean

const screenKeys = new Set<{ current: ScreenKeys }>()

export function useScreenKeys(handler: ScreenKeys) {
  const ref = useRef(handler)
  useEffect(() => {
    ref.current = handler
  })
  useEffect(() => {
    screenKeys.add(ref)
    return () => {
      screenKeys.delete(ref)
    }
  }, [])
}

export function availableChords(hrefs: Set<string>) {
  return GO_CHORDS.filter((chord) => chord.href === '/admin' || hrefs.has(chord.href))
}

export function useMenuHrefs() {
  const { props } = usePage()
  const hrefs = new Set<string>()
  for (const group of props.admin?.menu ?? []) {
    for (const item of group.items) {
      hrefs.add(item.href.split('?')[0])
      for (const link of item.submenu) hrefs.add(link.href.split('?')[0])
    }
  }
  return hrefs
}

export function useKeyboard({ onHelp }: { onHelp: () => void }) {
  const hrefs = useMenuHrefs()
  const state = useRef({
    pending: false,
    timer: undefined as ReturnType<typeof setTimeout> | undefined,
    current: null as HTMLElement | null,
    chords: [] as GoChord[],
    onHelp: (() => {}) as () => void,
  })
  const chords = availableChords(hrefs)

  useEffect(() => {
    state.current.chords = chords
    state.current.onHelp = onHelp
  })

  useEffect(() => {
    const self = state.current

    const current = () => (self.current?.isConnected ? self.current : null)

    const clear = () => {
      const item = current()
      if (item) {
        item.removeAttribute(CURRENT)
        if (document.activeElement === item) item.blur()
      }
      self.current = null
    }

    const select = (item: HTMLElement | undefined) => {
      if (!item) return
      clear()
      self.current = item
      item.setAttribute(CURRENT, '')
      if (!item.hasAttribute('tabindex')) item.tabIndex = -1
      item.focus({ preventScroll: true })
      item.scrollIntoView({ block: 'nearest' })
    }

    const pick = (item: HTMLElement | undefined) => {
      if (!item) return false
      select(item)
      return true
    }

    const step = (delta: number) => {
      const list = items()
      if (!list.length) return false
      let index = list.indexOf(current()!)
      if (index < 0) index = list.findIndex((item) => item.contains(document.activeElement))
      index =
        index < 0
          ? delta > 0
            ? 0
            : list.length - 1
          : Math.min(Math.max(index + delta, 0), list.length - 1)
      select(list[index])
      return true
    }

    const trigger = (key: string) => {
      const declared = Array.from(document.querySelectorAll<HTMLElement>('[data-keys]')).filter(
        (element) => declares(element, key) && usable(element)
      )
      const item = current()
      const element =
        declared.find((candidate) => item?.contains(candidate)) ??
        declared.find((candidate) => !candidate.closest(ITEM))
      if (!element) return false
      if (element.hasAttribute('data-keys-focus')) {
        element.focus()
        if (element instanceof HTMLInputElement) element.select()
      } else {
        element.click()
      }
      return true
    }

    const open = () => {
      const item = current()
      if (!item) return false
      if (document.activeElement !== item && item.contains(document.activeElement)) return false
      const opener =
        item.querySelector<HTMLElement>('[data-list-open]') ??
        item.querySelector<HTMLElement>('a[href]')
      if (!opener) return false
      opener.click()
      return true
    }

    const toggleSelect = () => {
      const box = current()?.querySelector<HTMLElement>('[data-list-select]')
      if (!box) return false
      box.click()
      return true
    }

    const focusSearch = () => {
      const input = Array.from(
        document.querySelectorAll<HTMLInputElement>('[data-list-search]')
      ).find(usable)
      if (!input) return false
      input.focus()
      input.select()
      return true
    }

    const up = () => {
      const link = document.querySelector<HTMLLinkElement>('link[rel="up"]')?.getAttribute('href')
      const target = link ?? parentPath(window.location.pathname)
      if (!target) return false
      router.visit(target)
      return true
    }

    const submit = (event: KeyboardEvent) => {
      const active = document.activeElement
      let form = active instanceof Element ? active.closest('form') : null
      if (!form) {
        const forms = Array.from(document.querySelectorAll<HTMLFormElement>('main form')).filter(
          (candidate) => usable(candidate) && candidate.getAttribute('role') !== 'search'
        )
        form = forms.length === 1 ? forms[0] : null
      }
      if (!form) return
      event.preventDefault()
      form.requestSubmit()
    }

    const keydown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) return
      const key = describe(event)

      if (key === 'meta+enter' || key === 'ctrl+enter') return submit(event)

      const target = event.target as Element | null
      if (target?.closest?.(TYPING) || document.querySelector(OVERLAY)) return
      if (event.ctrlKey || event.metaKey || event.altKey) return

      const handled = (done: boolean) => {
        if (done) event.preventDefault()
      }

      if (self.pending) {
        self.pending = false
        clearTimeout(self.timer)
        if (key === 'g') return handled(pick(items()[0]))
        const chord = self.chords.find((item) => item.key === key)
        if (chord) {
          event.preventDefault()
          router.visit(chord.href)
          return
        }
        return handled(trigger(`g ${key}`))
      }

      for (const screen of screenKeys) {
        if (screen.current(key)) return event.preventDefault()
      }

      switch (key) {
        case 'g':
          event.preventDefault()
          self.pending = true
          self.timer = setTimeout(() => (self.pending = false), CHORD_TIMEOUT)
          return
        case 'j':
          return handled(step(1))
        case 'k':
          return handled(step(-1))
        case 'G':
          return handled(pick(items().at(-1)))
        case 'enter':
        case 'o':
          if (open()) return event.preventDefault()
          break
        case 'x':
          if (toggleSelect()) return event.preventDefault()
          break
        case '/':
          return handled(focusSearch())
        case '?':
          event.preventDefault()
          self.onHelp()
          return
        case 'esc':
          if (current()) {
            event.preventDefault()
            clear()
            return
          }
          if (trigger('esc')) return event.preventDefault()
          return handled(up())
      }
      handled(trigger(key))
    }

    const focusin = (event: FocusEvent) => {
      const item = current()
      if (item && event.target instanceof Node && !item.contains(event.target)) clear()
    }

    const reset = router.on('navigate', () => {
      self.current = null
      self.pending = false
    })

    document.addEventListener('keydown', keydown)
    document.addEventListener('focusin', focusin)
    return () => {
      reset()
      clearTimeout(self.timer)
      document.removeEventListener('keydown', keydown)
      document.removeEventListener('focusin', focusin)
    }
  }, [])
}
