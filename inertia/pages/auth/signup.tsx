import type { FormEvent } from 'react'
import { useForm } from '@inertiajs/react'
import { ArrowRight } from 'lucide-react'
import type { InertiaProps } from '~/types'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import FormField from '~/components/admin/form_field'
import AuthShell from '~/components/auth/auth_shell'
import { urlFor } from '~/client'

type Props = InertiaProps<{ siteName: string }>

export default function Signup({ siteName }: Props) {
  const form = useForm({
    siteName,
    fullName: '',
    email: '',
    password: '',
    passwordConfirmation: '',
  })

  function submit(event: FormEvent) {
    event.preventDefault()
    form.post(urlFor('signup.store'), {
      onError: () => form.reset('password', 'passwordConfirmation'),
    })
  }

  return (
    <AuthShell
      title="Welcome"
      description="Set up your site and create the owner account. You'll be its administrator; add everyone else later from Users."
    >
      <form onSubmit={submit} className="grid gap-4">
        <FormField
          label="Site name"
          htmlFor="siteName"
          error={form.errors.siteName}
          help="You can change it later in Settings."
        >
          <Input
            id="siteName"
            value={form.data.siteName}
            onChange={(event) => form.setData('siteName', event.target.value)}
          />
        </FormField>
        <FormField label="Your name" htmlFor="fullName" error={form.errors.fullName} required>
          <Input
            id="fullName"
            autoComplete="name"
            autoFocus
            required
            value={form.data.fullName}
            onChange={(event) => form.setData('fullName', event.target.value)}
          />
        </FormField>
        <FormField label="Email" htmlFor="email" error={form.errors.email} required>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={form.data.email}
            onChange={(event) => form.setData('email', event.target.value)}
          />
        </FormField>
        <FormField
          label="Password"
          htmlFor="password"
          error={form.errors.password}
          help="At least 8 characters."
          required
        >
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            value={form.data.password}
            onChange={(event) => form.setData('password', event.target.value)}
          />
        </FormField>
        <FormField
          label="Confirm password"
          htmlFor="passwordConfirmation"
          error={form.errors.passwordConfirmation}
          required
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
          {form.processing ? 'Setting up…' : 'Create the owner account'}
          <ArrowRight />
        </Button>
      </form>
    </AuthShell>
  )
}
