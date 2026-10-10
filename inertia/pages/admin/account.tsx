import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Head, router, useForm } from '@inertiajs/react'
import type { InertiaProps } from '~/types'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '~/components/ui/alert_dialog'
import PageHeader from '~/components/admin/page_header'
import FormField from '~/components/admin/form_field'
import TwoFactorSection, { type TwoFactorState } from '~/components/account/two_factor_section'
import SessionsSection, { type AccountSession } from '~/components/account/sessions_section'
import { formatDate } from '~/lib/format'
import { urlFor } from '~/client'

type Props = InertiaProps<{
  account: {
    fullName: string
    email: string
    roleName: string | null
    verified: boolean
    createdAt: string
    lastAdmin: boolean
  }
  twoFactor: TwoFactorState
  recoveryCodes: string[] | null
  sessions: AccountSession[]
}>

const SECTIONS = [
  { value: 'profile', label: 'Profile' },
  { value: 'email', label: 'Email' },
  { value: 'password', label: 'Password' },
  { value: 'two-factor', label: 'Two-factor' },
  { value: 'sessions', label: 'Sessions' },
  { value: 'delete', label: 'Delete' },
]

const submitOptions = { preserveScroll: true, preserveState: true }

function Section({
  title,
  description,
  children,
  danger,
}: {
  title: string
  description?: ReactNode
  children: ReactNode
  danger?: boolean
}) {
  return (
    <Card className={danger ? 'border-destructive/40' : undefined}>
      <CardHeader>
        <CardTitle className={danger ? 'text-destructive' : undefined}>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function PasswordInput({
  id,
  value,
  onChange,
  autoComplete = 'current-password',
}: {
  id: string
  value: string
  onChange: (value: string) => void
  autoComplete?: string
}) {
  return (
    <Input
      id={id}
      type="password"
      required
      autoComplete={autoComplete}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  )
}

function ProfileForm({ fullName }: { fullName: string }) {
  const form = useForm({ fullName })
  function submit(event: FormEvent) {
    event.preventDefault()
    form.put(urlFor('admin.account.update'), submitOptions)
  }
  return (
    <form onSubmit={submit} className="grid max-w-md gap-4">
      <FormField label="Name" htmlFor="fullName" error={form.errors.fullName} required>
        <Input
          id="fullName"
          required
          autoComplete="name"
          value={form.data.fullName}
          onChange={(event) => form.setData('fullName', event.target.value)}
        />
      </FormField>
      <div>
        <Button type="submit" disabled={form.processing}>
          {form.processing ? 'Saving…' : 'Save name'}
        </Button>
      </div>
    </form>
  )
}

function EmailForm({ email, verified }: { email: string; verified: boolean }) {
  const form = useForm({ email, currentPassword: '' })
  function submit(event: FormEvent) {
    event.preventDefault()
    form.put(urlFor('admin.account.email'), {
      ...submitOptions,
      onFinish: () => form.reset('currentPassword'),
    })
  }
  return (
    <div className="grid gap-6">
      {!verified && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm dark:border-amber-500/40 dark:bg-amber-500/10">
          <span>Your email address isn’t verified yet.</span>
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto p-0"
            onClick={() =>
              router.post(urlFor('admin.account.email_verification'), {}, submitOptions)
            }
          >
            Resend the verification email
          </Button>
        </div>
      )}
      <form onSubmit={submit} className="grid max-w-md gap-4">
        <FormField label="Email address" htmlFor="email" error={form.errors.email} required>
          <Input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={form.data.email}
            onChange={(event) => form.setData('email', event.target.value)}
          />
        </FormField>
        <FormField
          label="Current password"
          htmlFor="emailCurrentPassword"
          error={form.errors.currentPassword}
          help="To confirm it's you."
          required
        >
          <PasswordInput
            id="emailCurrentPassword"
            value={form.data.currentPassword}
            onChange={(value) => form.setData('currentPassword', value)}
          />
        </FormField>
        <div>
          <Button type="submit" disabled={form.processing}>
            {form.processing ? 'Saving…' : 'Save email'}
          </Button>
        </div>
      </form>
    </div>
  )
}

function PasswordForm() {
  const form = useForm({ currentPassword: '', password: '', passwordConfirmation: '' })
  function submit(event: FormEvent) {
    event.preventDefault()
    form.put(urlFor('admin.account.password'), {
      ...submitOptions,
      onFinish: () => form.reset(),
    })
  }
  return (
    <form onSubmit={submit} className="grid max-w-md gap-4">
      <FormField
        label="Current password"
        htmlFor="currentPassword"
        error={form.errors.currentPassword}
        required
      >
        <PasswordInput
          id="currentPassword"
          value={form.data.currentPassword}
          onChange={(value) => form.setData('currentPassword', value)}
        />
      </FormField>
      <FormField
        label="New password"
        htmlFor="newPassword"
        error={form.errors.password}
        help="At least 8 characters."
        required
      >
        <PasswordInput
          id="newPassword"
          autoComplete="new-password"
          value={form.data.password}
          onChange={(value) => form.setData('password', value)}
        />
      </FormField>
      <FormField
        label="Confirm new password"
        htmlFor="passwordConfirmation"
        error={form.errors.passwordConfirmation}
        required
      >
        <PasswordInput
          id="passwordConfirmation"
          autoComplete="new-password"
          value={form.data.passwordConfirmation}
          onChange={(value) => form.setData('passwordConfirmation', value)}
        />
      </FormField>
      <div>
        <Button type="submit" disabled={form.processing}>
          {form.processing ? 'Saving…' : 'Save password'}
        </Button>
      </div>
    </form>
  )
}

function DeleteForm({ lastAdmin }: { lastAdmin: boolean }) {
  const form = useForm({ currentPassword: '' })
  const [open, setOpen] = useState(false)

  function submit(event: FormEvent) {
    event.preventDefault()
    setOpen(true)
  }

  function confirm() {
    form.delete(urlFor('admin.account.destroy'), {
      ...submitOptions,
      onFinish: () => {
        setOpen(false)
        form.reset()
      },
    })
  }

  if (lastAdmin) {
    return (
      <p className="text-muted-foreground text-sm">
        You’re the last admin, so your account can’t be deleted. Make someone else an admin first.
      </p>
    )
  }

  return (
    <form onSubmit={submit} className="grid max-w-md gap-4">
      <FormField
        label="Your password"
        htmlFor="deletePassword"
        error={form.errors.currentPassword}
        help="To confirm it's you."
        required
      >
        <PasswordInput
          id="deletePassword"
          value={form.data.currentPassword}
          onChange={(value) => form.setData('currentPassword', value)}
        />
      </FormField>
      <div>
        <Button type="submit" variant="destructive" disabled={form.processing}>
          Delete my account
        </Button>
      </div>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              You’ll be signed out everywhere and won’t be able to sign in again. This can’t be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={form.processing}
              onClick={(event) => {
                event.preventDefault()
                confirm()
              }}
            >
              Delete account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  )
}

function SummaryRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <li className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      {children}
    </li>
  )
}

export default function Account({ account, twoFactor, recoveryCodes, sessions }: Props) {
  const [tab, setTab] = useState(() => {
    if (recoveryCodes) return 'two-factor'
    const hash = typeof window === 'undefined' ? '' : window.location.hash.slice(1)
    return SECTIONS.some((section) => section.value === hash) ? hash : 'profile'
  })

  useEffect(() => {
    function follow() {
      const hash = window.location.hash.slice(1)
      if (SECTIONS.some((section) => section.value === hash)) setTab(hash)
    }
    window.addEventListener('hashchange', follow)
    return () => window.removeEventListener('hashchange', follow)
  }, [])

  function select(value: string) {
    setTab(value)
    window.history.replaceState(window.history.state, '', `#${value}`)
  }

  return (
    <>
      <Head title="Account" />
      <PageHeader
        title="Account"
        description={
          account.roleName ? `You're signed in as ${account.roleName}.` : 'You have no role yet.'
        }
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <Tabs value={tab} onValueChange={select} className="min-w-0 gap-4">
          <div className="-mx-1 overflow-x-auto px-1">
            <TabsList>
              {SECTIONS.map((section) => (
                <TabsTrigger key={section.value} value={section.value}>
                  {section.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          <TabsContent value="profile">
            <Section title="Profile" description="How your name appears in the admin.">
              <ProfileForm fullName={account.fullName} />
            </Section>
          </TabsContent>
          <TabsContent value="email">
            <Section
              title="Email"
              description="The address you sign in with. A new address has to be verified."
            >
              <EmailForm email={account.email} verified={account.verified} />
            </Section>
          </TabsContent>
          <TabsContent value="password">
            <Section
              title="Password"
              description="Use a long, random password. Changing it signs you out on every other device."
            >
              <PasswordForm />
            </Section>
          </TabsContent>
          <TabsContent value="two-factor">
            <Section
              title="Two-factor authentication"
              description="Adds a second step at sign-in: a code from an authenticator app (1Password, Authy, Google Authenticator…)."
            >
              <TwoFactorSection state={twoFactor} recoveryCodes={recoveryCodes} />
            </Section>
          </TabsContent>
          <TabsContent value="sessions">
            <Section
              title="Sessions"
              description="Everywhere you're signed in. Signing a session out ends it on that device."
            >
              <SessionsSection sessions={sessions} />
            </Section>
          </TabsContent>
          <TabsContent value="delete">
            <Section
              title="Delete account"
              description="Deletes your account. Content you created stays. This can't be undone."
              danger
            >
              <DeleteForm lastAdmin={account.lastAdmin} />
            </Section>
          </TabsContent>
        </Tabs>
        <aside className="lg:pt-13">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Your account</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-3 text-sm">
                <SummaryRow label="Email">
                  {account.verified ? (
                    <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
                      Verified
                    </Badge>
                  ) : (
                    <Badge variant="outline">Not verified</Badge>
                  )}
                </SummaryRow>
                <SummaryRow label="Two-factor">
                  {twoFactor.enabled ? (
                    <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
                      Enabled
                    </Badge>
                  ) : (
                    <Badge variant="outline">Off</Badge>
                  )}
                </SummaryRow>
                <SummaryRow label="Signed in on">
                  <button
                    type="button"
                    className="font-medium underline-offset-4 hover:underline"
                    onClick={() => select('sessions')}
                  >
                    {sessions.length === 1 ? '1 device' : `${sessions.length} devices`}
                  </button>
                </SummaryRow>
                <SummaryRow label="Role">
                  <span className="font-medium">{account.roleName ?? 'No role'}</span>
                </SummaryRow>
                <SummaryRow label="Member since">
                  <span className="font-medium">{formatDate(account.createdAt)}</span>
                </SummaryRow>
              </ul>
            </CardContent>
          </Card>
        </aside>
      </div>
    </>
  )
}
