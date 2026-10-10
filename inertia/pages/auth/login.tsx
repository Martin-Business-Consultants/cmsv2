import type { FormEvent } from 'react'
import { useForm } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { ArrowRight } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import FormField from '~/components/admin/form_field'
import AuthShell from '~/components/auth/auth_shell'
import { urlFor } from '~/client'

export default function Login() {
  const form = useForm({ email: '', password: '' })

  function submit(event: FormEvent) {
    event.preventDefault()
    form.post(urlFor('session.store'), { onFinish: () => form.reset('password') })
  }

  return (
    <AuthShell title="Sign in" description="Enter your email and password to sign in.">
      <form onSubmit={submit} className="grid gap-4">
        <FormField label="Email" htmlFor="email" error={form.errors.email}>
          <Input
            id="email"
            type="email"
            autoComplete="username"
            autoFocus
            required
            placeholder="email@example.com"
            value={form.data.email}
            onChange={(event) => form.setData('email', event.target.value)}
          />
        </FormField>
        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="password" className="text-sm leading-none font-medium">
              Password
            </label>
            <Link
              href={urlFor('password_reset.create')}
              className="text-muted-foreground hover:text-foreground text-xs underline-offset-4 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={form.data.password}
            onChange={(event) => form.setData('password', event.target.value)}
          />
          {form.errors.password && (
            <p className="text-destructive text-xs">{form.errors.password}</p>
          )}
        </div>
        <Button type="submit" disabled={form.processing}>
          {form.processing ? 'Signing in…' : 'Sign in'}
          <ArrowRight />
        </Button>
      </form>
    </AuthShell>
  )
}
