import { useState, type FormEvent } from 'react'
import { useForm } from '@inertiajs/react'
import { Check, Copy, KeyRound, ShieldCheck } from 'lucide-react'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import FormField from '~/components/admin/form_field'
import CopyField from '~/components/admin/copy_field'
import ConfirmButton from '~/components/account/confirm_button'
import { formatDate } from '~/lib/format'
import { urlFor } from '~/client'

export type TwoFactorState = {
  enabled: boolean
  enabledAt: string | null
  recoveryCodesLeft: number
  secret: string | null
  uri: string | null
  qrCode: string | null
}

function RecoveryCodes({ codes }: { codes: string[] }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(codes.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="grid gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-500/40 dark:bg-amber-500/10">
      <div className="grid gap-1">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <KeyRound className="size-4" />
          Save your recovery codes
        </h3>
        <p className="text-muted-foreground text-sm">
          Each code works once, in place of an authenticator code. Store them somewhere safe: this
          is the only time they’re shown.
        </p>
      </div>
      <ul className="grid grid-cols-2 gap-2" aria-label="Recovery codes">
        {codes.map((code) => (
          <li key={code} className="bg-background rounded-md border px-2 py-1 font-mono text-sm">
            {code}
          </li>
        ))}
      </ul>
      <div>
        <Button type="button" variant="outline" size="sm" onClick={copy}>
          {copied ? <Check /> : <Copy />}
          {copied ? 'Copied' : 'Copy all'}
        </Button>
      </div>
    </div>
  )
}

export default function TwoFactorSection({
  state,
  recoveryCodes,
}: {
  state: TwoFactorState
  recoveryCodes: string[] | null
}) {
  const form = useForm({ code: '' })

  function submit(event: FormEvent) {
    event.preventDefault()
    form.post(urlFor('admin.two_factor.store'), {
      preserveScroll: true,
      preserveState: true,
      onSuccess: () => form.reset(),
    })
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      {recoveryCodes && <RecoveryCodes codes={recoveryCodes} />}

      {state.enabled ? (
        <div className="grid gap-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
              <ShieldCheck />
              Enabled
            </Badge>
            {state.enabledAt && (
              <span className="text-muted-foreground">since {formatDate(state.enabledAt)}</span>
            )}
          </div>
          <p className="text-sm">
            {state.recoveryCodesLeft === 1
              ? '1 recovery code left.'
              : `${state.recoveryCodesLeft} recovery codes left.`}
          </p>
          <div className="flex flex-wrap gap-2">
            <ConfirmButton
              trigger={
                <Button variant="outline" size="sm">
                  Regenerate recovery codes
                </Button>
              }
              title="Generate new recovery codes?"
              description="Your old codes stop working immediately."
              confirmLabel="Generate new codes"
              href={urlFor('admin.two_factor.regenerate')}
              method="post"
            />
            <ConfirmButton
              trigger={
                <Button variant="outline" size="sm" className="text-destructive">
                  Disable two-factor
                </Button>
              }
              title="Disable two-factor authentication?"
              description="Your account will be protected by its password alone."
              confirmLabel="Disable"
              href={urlFor('admin.two_factor.destroy')}
              method="delete"
              destructive
            />
          </div>
        </div>
      ) : (
        state.uri && (
          <ol className="grid grid-cols-[minmax(0,1fr)] gap-6 text-sm">
            <li className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3">
              <p>
                <span className="font-medium">1. Add this account to your authenticator app.</span>{' '}
                Scan the QR code, open the link on your phone, or enter the secret by hand.
              </p>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                {state.qrCode && (
                  <img
                    src={`data:image/svg+xml;utf8,${encodeURIComponent(state.qrCode)}`}
                    alt="QR code for your authenticator app"
                    className="size-44 shrink-0 rounded-md border bg-white p-2"
                  />
                )}
                <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)] gap-3">
                  <div className="grid min-w-0 gap-1.5">
                    <span className="text-muted-foreground text-xs font-medium">Secret</span>
                    <CopyField value={state.secret ?? ''} />
                  </div>
                  <div className="grid min-w-0 gap-1.5">
                    <span className="text-muted-foreground text-xs font-medium">otpauth link</span>
                    <CopyField value={state.uri} />
                  </div>
                </div>
              </div>
            </li>
            <li>
              <form onSubmit={submit} className="grid gap-3">
                <span className="font-medium">2. Enter the 6-digit code from the app.</span>
                <FormField htmlFor="totp-code" error={form.errors.code}>
                  <Input
                    id="totp-code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9 ]{6,7}"
                    placeholder="000000"
                    required
                    className="w-40 font-mono"
                    value={form.data.code}
                    onChange={(event) => form.setData('code', event.target.value)}
                  />
                </FormField>
                <div>
                  <Button type="submit" disabled={form.processing}>
                    {form.processing ? 'Verifying…' : 'Verify and enable'}
                  </Button>
                </div>
              </form>
            </li>
          </ol>
        )
      )}
    </div>
  )
}
