import { useEffect, useEffectEvent, useRef } from 'react'
import type { PublicCaptcha } from '../../app/types'

type WidgetApi = {
  render: (el: HTMLElement, options: Record<string, unknown>) => string | number
  reset: (id?: any) => void
  remove?: (id: any) => void
}

declare global {
  interface Window {
    turnstile?: WidgetApi
    grecaptcha?: WidgetApi & { ready?: (callback: () => void) => void }
    onRecaptchaLoad?: () => void
  }
}

const SCRIPTS = {
  turnstile: 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit',
  recaptcha: 'https://www.google.com/recaptcha/api.js?render=explicit&onload=onRecaptchaLoad',
}

const loaders: Partial<Record<PublicCaptcha['provider'], Promise<WidgetApi>>> = {}

function current(provider: PublicCaptcha['provider']) {
  return provider === 'turnstile' ? window.turnstile : window.grecaptcha
}

function load(provider: PublicCaptcha['provider']): Promise<WidgetApi> {
  const ready = current(provider)
  if (ready?.render) return Promise.resolve(ready)
  if (!loaders[provider]) {
    loaders[provider] = new Promise((resolve, reject) => {
      const done = () => {
        const api = current(provider)
        if (api?.render) resolve(api)
        else reject(new Error('Captcha failed to load'))
      }
      const script = document.createElement('script')
      script.src = SCRIPTS[provider]
      script.async = true
      script.defer = true
      if (provider === 'recaptcha') window.onRecaptchaLoad = done
      else script.onload = done
      script.onerror = () => {
        delete loaders[provider]
        reject(new Error('Captcha failed to load'))
      }
      document.head.appendChild(script)
    })
  }
  return loaders[provider]!
}

export default function Captcha({
  captcha,
  onToken,
  resetKey,
}: {
  captcha: PublicCaptcha
  onToken: (token: string) => void
  resetKey: number
}) {
  const container = useRef<HTMLDivElement>(null)
  const widget = useRef<string | number | null>(null)
  const emit = useEffectEvent((token: string) => onToken(token))
  const { provider, siteKey } = captcha

  useEffect(() => {
    let cancelled = false
    load(provider)
      .then((api) => {
        if (cancelled || !container.current || widget.current !== null) return
        widget.current = api.render(container.current, {
          'sitekey': siteKey,
          'callback': (token: string) => emit(token),
          'expired-callback': () => emit(''),
          'error-callback': () => emit(''),
        })
      })
      .catch(() => {})
    return () => {
      cancelled = true
      const api = current(provider)
      if (widget.current !== null && api?.remove) api.remove(widget.current)
      if (container.current) container.current.innerHTML = ''
      widget.current = null
    }
  }, [provider, siteKey])

  useEffect(() => {
    const api = current(provider)
    if (resetKey && widget.current !== null && api) {
      api.reset(widget.current)
      emit('')
    }
  }, [resetKey, provider])

  return <div ref={container} className="min-h-[65px]" />
}
