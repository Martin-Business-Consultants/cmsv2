import { useState } from 'react'
import { Check, Copy, Eye, EyeOff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '~/components/ui/button'
import { cn } from '~/lib/utils'

function xsrfToken() {
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : ''
}

export default function SecretField({
  masked,
  visible,
  revealUrl,
  className,
}: {
  masked: string
  visible: boolean
  revealUrl?: string | null
  className?: string
}) {
  const [secret, setSecret] = useState<string | null>(null)
  const [shown, setShown] = useState(false)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  async function fetchSecret() {
    if (secret) return secret
    if (!revealUrl) return null
    setLoading(true)
    try {
      const response = await fetch(revealUrl, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'X-XSRF-TOKEN': xsrfToken() },
      })
      if (response.status === 410) {
        toast.error('This token can’t be shown. Rotate it to get a readable secret.')
        return null
      }
      if (!response.ok) throw new Error(String(response.status))
      const body = (await response.json()) as { token: string }
      setSecret(body.token)
      return body.token
    } catch {
      toast.error('Couldn’t reveal the token. Try again.')
      return null
    } finally {
      setLoading(false)
    }
  }

  async function toggle() {
    if (shown) return setShown(false)
    if (await fetchSecret()) setShown(true)
  }

  async function copy() {
    const value = await fetchSecret()
    if (!value) return
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const canReveal = visible && Boolean(revealUrl)

  return (
    <div className={cn('grid gap-1.5', className)}>
      <div className="bg-background flex items-center gap-1 rounded-md border p-1 pl-3">
        <code
          className="min-w-0 flex-1 overflow-x-auto py-1 font-mono text-xs whitespace-nowrap"
          data-secret={shown ? 'revealed' : 'masked'}
        >
          {shown && secret ? secret : masked}
        </code>
        {canReveal && (
          <>
            <Button type="button" variant="ghost" size="sm" onClick={toggle} disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : shown ? <EyeOff /> : <Eye />}
              {shown ? 'Hide' : 'Reveal'}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={copy} disabled={loading}>
              {copied ? <Check /> : <Copy />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </>
        )}
      </div>
      {!visible && revealUrl && (
        <p className="text-muted-foreground text-xs">
          This token was created before secrets were stored, so it can’t be shown. It still works;
          rotate it to get one you can reveal.
        </p>
      )}
    </div>
  )
}
