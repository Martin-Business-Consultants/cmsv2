import type { FormEvent } from 'react'
import { router, useForm } from '@inertiajs/react'
import { ArrowRight } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import FormField from '~/components/admin/form_field'
import AuthShell from '~/components/auth/auth_shell'
import { urlFor } from '~/client'

export default function Challenge() {
  const form = useForm({ code: '' })

  function submit(event: FormEvent) {
    event.preventDefault()
    form.post(urlFor('session.verify'), { onFinish: () => form.reset('code') })
  }

  return (
    <AuthShell
      title="Two-factor verification"
      description="Enter the 6-digit code from your authenticator app, or one of your single-use recovery codes."
      footer={
        <button
          type="button"
          className="hover:text-foreground underline-offset-4 hover:underline"
          onClick={() => router.post(urlFor('session.cancel'))}
        >
          Cancel and sign in as someone else
        </button>
      }
    >
      <form onSubmit={submit} className="grid gap-4">
        <FormField
          label="Code"
          htmlFor="code"
          error={form.errors.code}
          help="Recovery codes are 16 characters; codes from an authenticator are 6 digits."
        >
          <Input
            id="code"
            autoFocus
            required
            autoComplete="one-time-code"
            placeholder="000000"
            className="text-center font-mono text-lg tracking-widest"
            value={form.data.code}
            onChange={(event) => form.setData('code', event.target.value)}
          />
        </FormField>
        <Button type="submit" disabled={form.processing}>
          {form.processing ? 'Verifying…' : 'Verify'}
          <ArrowRight />
        </Button>
      </form>
    </AuthShell>
  )
}
