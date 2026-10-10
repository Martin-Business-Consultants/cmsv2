import type { FormEvent } from 'react'
import { useForm } from '@inertiajs/react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import FormField from '~/components/admin/form_field'
import { Checkbox } from '~/components/ui/checkbox'
import { Label } from '~/components/ui/label'

export type RoleChoice = { id: number; name: string; description: string | null; isAdmin: boolean }

export type UserFormData = {
  fullName: string
  email: string
  roleId: number | null
  verified: boolean
  password: string
  passwordConfirmation: string
}

export default function UserForm({
  initial,
  roles,
  action,
  method,
  submitLabel,
  passwordOptional,
  readOnly,
}: {
  initial: UserFormData
  roles: RoleChoice[]
  action: string
  method: 'post' | 'put'
  submitLabel: string
  passwordOptional?: boolean
  readOnly?: boolean
}) {
  const form = useForm<UserFormData>(initial)
  const selected = roles.find((role) => role.id === form.data.roleId)

  function submit(event: FormEvent) {
    event.preventDefault()
    form.submit(method, action, { preserveScroll: true })
  }

  return (
    <form onSubmit={submit} className="grid max-w-2xl gap-6">
      <fieldset disabled={readOnly} className="contents">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Who this person is and what they can do.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <FormField label="Full name" htmlFor="fullName" error={form.errors.fullName} required>
              <Input
                id="fullName"
                value={form.data.fullName}
                onChange={(event) => form.setData('fullName', event.target.value)}
                autoComplete="off"
              />
            </FormField>
            <FormField label="Email" htmlFor="email" error={form.errors.email} required>
              <Input
                id="email"
                type="email"
                value={form.data.email}
                onChange={(event) => form.setData('email', event.target.value)}
                autoComplete="off"
              />
            </FormField>
            <FormField
              label="Role"
              error={form.errors.roleId}
              help={
                selected?.description ??
                (form.data.roleId ? undefined : "Can sign in, but can't see or change anything.")
              }
            >
              <Select
                value={form.data.roleId ? String(form.data.roleId) : 'none'}
                onValueChange={(value) =>
                  form.setData('roleId', value === 'none' ? null : Number(value))
                }
              >
                <SelectTrigger id="roleId" className="w-full">
                  <SelectValue placeholder="Choose a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No role</SelectItem>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={String(role.id)}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <div className="flex items-start gap-3">
              <Checkbox
                id="verified"
                checked={form.data.verified}
                onCheckedChange={(checked) => form.setData('verified', checked === true)}
              />
              <div className="grid gap-1">
                <Label htmlFor="verified">Email verified</Label>
                <p className="text-muted-foreground text-xs">
                  Only verified addresses can reset a forgotten password.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Password</CardTitle>
            <CardDescription>
              {passwordOptional
                ? 'Leave blank to keep their current password.'
                : 'At least 8 characters. Share it with them securely.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Password"
              htmlFor="password"
              error={form.errors.password}
              required={!passwordOptional}
            >
              <Input
                id="password"
                type="password"
                value={form.data.password}
                onChange={(event) => form.setData('password', event.target.value)}
                autoComplete="new-password"
              />
            </FormField>
            <FormField
              label="Confirm password"
              htmlFor="passwordConfirmation"
              error={form.errors.passwordConfirmation}
              required={!passwordOptional}
            >
              <Input
                id="passwordConfirmation"
                type="password"
                value={form.data.passwordConfirmation}
                onChange={(event) => form.setData('passwordConfirmation', event.target.value)}
                autoComplete="new-password"
              />
            </FormField>
          </CardContent>
        </Card>
      </fieldset>
      {!readOnly && (
        <div className="flex justify-end">
          <Button type="submit" disabled={form.processing}>
            {form.processing ? 'Saving…' : submitLabel}
          </Button>
        </div>
      )}
    </form>
  )
}
