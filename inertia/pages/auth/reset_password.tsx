import type { FormEvent } from 'react'
import { useForm } from '@inertiajs/react'
import type { InertiaProps } from '~/types'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import FormField from '~/components/admin/form_field'
import AuthShell from '~/components/auth/auth_shell'
import { urlFor } from '~/client'

type Props = InertiaProps<{ token: string; email: string }>

export default function ResetPassword({ token, email }: Props) {
  const form = useForm({ password: '', passwordConfirmation: '' })

  function submit(event: FormEvent) {
    event.preventDefault()
    form.put(urlFor('password_reset.update', { token }), {
      onError: () => form.reset(),
    })
  }

  return (
    <AuthShell title="Set a new password" description={`For ${email}.`}>
      <form onSubmit={submit} className="grid gap-4">
        <FormField
          label="New password"
          htmlFor="password"
          error={form.errors.password}
          help="At least 8 characters."
        >
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            autoFocus
            required
            value={form.data.password}
            onChange={(event) => form.setData('password', event.target.value)}
          />
        </FormField>
        <FormField
          label="Confirm new password"
          htmlFor="passwordConfirmation"
          error={form.errors.passwordConfirmation}
        >
          <Input
            id="passwordConfirmation"
            type="password"
            autoComplete="new-password"
            required
            value={form.data.passwordConfirmation}
            onChange={(event) => form.setData('passwordConfirmation', event.target.value)}
          />
        </FormField>
        <Button type="submit" disabled={form.processing}>
          {form.processing ? 'Saving…' : 'Save new password'}
        </Button>
      </form>
    </AuthShell>
  )
}
