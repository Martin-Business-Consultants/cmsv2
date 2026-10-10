import type { FormEvent } from 'react'
import { router, useForm } from '@inertiajs/react'
import { ArrowRight } from 'lucide-react'
import type { InertiaProps } from '~/types'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import FormField from '~/components/admin/form_field'
import AuthShell, { Notice } from '~/components/auth/auth_shell'

type Props = InertiaProps<{
  code: string
  authorization: {
    userCode: string
    purpose: 'user' | 'site'
    hostname: string | null
    label: string | null
    approvable: boolean
  } | null
  userName: string
}>

function Decision({ authorization }: { authorization: NonNullable<Props['authorization']> }) {
  const form = useForm({ code: authorization.userCode, decision: 'approve' })

  function decide(decision: 'approve' | 'deny') {
    form.transform((data) => ({ ...data, decision }))
    form.post('/connect')
  }

  return (
    <div className="grid gap-4">
      {authorization.purpose === 'site' ? (
        <>
          <p className="text-muted-foreground text-sm">
            The Astro site{' '}
            <strong className="text-foreground font-semibold">
              {authorization.label || 'a site'}
            </strong>{' '}
            (on {authorization.hostname || 'a machine'}) is asking for a read-only token of its own,
            to build from this CMS’s content. It gets the Production site role, and a service token
            you can revoke under Settings › Service tokens.
          </p>
          {!authorization.approvable && (
            <Notice tone="error">
              Your role can’t issue service tokens. Ask someone who manages settings to approve it.
            </Notice>
          )}
        </>
      ) : (
        <p className="text-muted-foreground text-sm">
          <strong className="text-foreground font-semibold">
            {authorization.hostname || 'A machine'}
          </strong>{' '}
          is asking to act as you in this CMS. It will be able to do whatever your role allows — no
          more.
        </p>
      )}
      <div className="bg-muted/40 rounded-md border px-3 py-2 text-center font-mono text-lg tracking-widest">
        {authorization.userCode}
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          className="flex-1"
          disabled={form.processing}
          onClick={() => decide('approve')}
        >
          Approve
        </Button>
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          disabled={form.processing}
          onClick={() => decide('deny')}
        >
          Deny
        </Button>
      </div>
    </div>
  )
}

function CodeForm({ code }: { code: string }) {
  const form = useForm({ code })

  function submit(event: FormEvent) {
    event.preventDefault()
    router.get('/connect', { code: form.data.code.trim() })
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <FormField label="Code" htmlFor="code">
        <Input
          id="code"
          autoFocus
          autoComplete="off"
          placeholder="ABCD-EFGH"
          className="text-center font-mono text-lg tracking-widest uppercase"
          value={form.data.code}
          onChange={(event) => form.setData('code', event.target.value)}
        />
      </FormField>
      {code && (
        <Notice tone="error">
          That code has expired or doesn’t exist. Run <code>cms login</code> again.
        </Notice>
      )}
      <Button type="submit" disabled={!form.data.code.trim()}>
        Continue
        <ArrowRight />
      </Button>
    </form>
  )
}

export default function Connect({ code, authorization, userName }: Props) {
  return (
    <AuthShell
      title="Connect a machine"
      description={authorization ? undefined : 'Enter the code your terminal is showing.'}
      footer={<span>Signed in as {userName}</span>}
    >
      {authorization ? (
        <Decision authorization={authorization} />
      ) : (
        <CodeForm key={code} code={code} />
      )}
    </AuthShell>
  )
}
