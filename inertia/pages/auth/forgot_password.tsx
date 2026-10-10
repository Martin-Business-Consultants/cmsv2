import type { FormEvent } from 'react'
import { useForm } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import FormField from '~/components/admin/form_field'
import AuthShell from '~/components/auth/auth_shell'
import { urlFor } from '~/client'

export default function ForgotPassword() {
  const form = useForm({ email: '' })

  function submit(event: FormEvent) {
    event.preventDefault()
    form.post(urlFor('password_reset.store'))
  }

  return (
    <AuthShell
      title="Forgot your password?"
      description="Enter your email and we'll send you a link to set a new one. The link works for 20 minutes."
      footer={
        <Link
          href={urlFor('session.create')}
          className="hover:text-foreground underline-offset-4 hover:underline"
        >
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={submit} className="grid gap-4">
        <FormField label="Email" htmlFor="email" error={form.errors.email}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            autoFocus
            required
            value={form.data.email}
            onChange={(event) => form.setData('email', event.target.value)}
          />
        </FormField>
        <Button type="submit" disabled={form.processing}>
          {form.processing ? 'Sending…' : 'Email me a reset link'}
        </Button>
      </form>
    </AuthShell>
  )
}
