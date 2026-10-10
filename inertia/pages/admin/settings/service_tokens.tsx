import type { FormEvent } from 'react'
import { Head, useForm } from '@inertiajs/react'
import { Ban, KeyRound, Plus, RefreshCw } from 'lucide-react'
import type { InertiaProps } from '~/types'
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'
import { Input } from '~/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import ConfirmAction from '~/components/admin/confirm_action'
import EmptyState from '~/components/admin/empty_state'
import FormField from '~/components/admin/form_field'
import SettingsShell from '~/components/settings/settings_shell'
import SecretField from '~/components/tokens/secret_field'
import { formatDateTime } from '~/lib/format'

type ServiceToken = {
  id: number
  name: string
  description: string | null
  roleName: string | null
  prefix: string
  masked: string
  visible: boolean
  revoked: boolean
  createdBy: string | null
  createdAt: string | null
  lastUsedAt: string | null
  lastUsedIp: string | null
  revokedAt: string | null
  capabilities: string[]
}

type Role = { id: number; name: string; description: string | null }

type Props = InertiaProps<{
  live: ServiceToken[]
  revoked: ServiceToken[]
  roles: Role[]
  defaultRoleId: number | null
  canManage: boolean
}>

function IssueForm({ roles, defaultRoleId }: { roles: Role[]; defaultRoleId: number | null }) {
  const form = useForm<{ name: string; roleId: string; description: string }>({
    name: '',
    roleId: defaultRoleId ? String(defaultRoleId) : '',
    description: '',
  })

  function submit(event: FormEvent) {
    event.preventDefault()
    form.post('/admin/settings/service-tokens', {
      preserveScroll: true,
      onSuccess: () => form.reset('name', 'description'),
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Issue a token</CardTitle>
        <CardDescription>
          Pick the role for the job: the token can do exactly what the role allows.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-5" aria-label="Issue a token">
          <div className="grid items-start gap-5 sm:grid-cols-2">
            <FormField label="Name" htmlFor="token-name" error={form.errors.name} required>
              <Input
                id="token-name"
                value={form.data.name}
                placeholder="Production site"
                maxLength={120}
                onChange={(event) => form.setData('name', event.target.value)}
              />
            </FormField>
            <FormField label="Role" htmlFor="token-role" error={form.errors.roleId} required>
              <Select
                value={form.data.roleId}
                onValueChange={(value) => form.setData('roleId', value)}
              >
                <SelectTrigger id="token-role" className="w-full">
                  <SelectValue placeholder="Pick a role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={String(role.id)}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>
          <FormField
            label="What it’s for"
            htmlFor="token-description"
            error={form.errors.description}
          >
            <Input
              id="token-description"
              value={form.data.description}
              placeholder="Cloudflare — example.com"
              onChange={(event) => form.setData('description', event.target.value)}
            />
          </FormField>
          <div>
            <Button type="submit" disabled={form.processing}>
              <Plus />
              {form.processing ? 'Issuing…' : 'Issue token'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function TokenRow({ token, canManage }: { token: ServiceToken; canManage: boolean }) {
  const manageable = canManage && !token.revoked
  return (
    <li className="grid gap-3 py-4 first:pt-0 last:pb-0" data-token={token.name}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid min-w-0 gap-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">{token.name}</span>
            {token.roleName && <Badge variant="secondary">{token.roleName}</Badge>}
            {token.revoked && <Badge variant="destructive">Revoked</Badge>}
          </div>
          {token.description && (
            <span className="text-muted-foreground text-xs">{token.description}</span>
          )}
          <span className="text-muted-foreground text-xs">
            {token.lastUsedAt
              ? `Last used ${formatDateTime(token.lastUsedAt)}${token.lastUsedIp ? ` from ${token.lastUsedIp}` : ''}`
              : 'Never used'}{' '}
            · created {formatDateTime(token.createdAt)}
            {token.createdBy ? ` by ${token.createdBy}` : ''}
            {token.revokedAt ? ` · revoked ${formatDateTime(token.revokedAt)}` : ''}
          </span>
        </div>
        {manageable && (
          <div className="flex gap-2">
            <ConfirmAction
              href={`/admin/settings/service-tokens/${token.id}/rotate`}
              method="post"
              destructive={false}
              title={`Rotate “${token.name}”?`}
              description="The current secret stops working immediately."
              confirmLabel="Rotate"
              trigger={
                <Button variant="outline" size="sm">
                  <RefreshCw />
                  Rotate
                </Button>
              }
            />
            <ConfirmAction
              href={`/admin/settings/service-tokens/${token.id}/revoke`}
              method="post"
              title={`Revoke “${token.name}”?`}
              description="Anything using it stops working immediately. The token stays listed under Revoked."
              confirmLabel="Revoke"
              trigger={
                <Button variant="outline" size="sm">
                  <Ban />
                  Revoke
                </Button>
              }
            />
          </div>
        )}
      </div>
      {manageable ? (
        <SecretField
          masked={token.masked}
          visible={token.visible}
          revealUrl={`/admin/settings/service-tokens/${token.id}/reveal`}
        />
      ) : (
        <code className="bg-muted/40 rounded-md border px-3 py-2 font-mono text-xs">
          {token.masked}
        </code>
      )}
      {token.capabilities.length > 0 && (
        <p className="text-muted-foreground font-mono text-xs">{token.capabilities.join(', ')}</p>
      )}
    </li>
  )
}

export default function ServiceTokens({ live, revoked, roles, defaultRoleId, canManage }: Props) {
  return (
    <>
      <Head title="Service tokens" />
      <SettingsShell
        title="Service tokens"
        description="Credentials for machines — a published site, a build, an agent."
      >
        <Card>
          <CardContent className="grid gap-3 text-sm">
            <p className="text-muted-foreground">
              They belong to this workspace rather than to a person, so rotating your own token or
              changing your role can’t take production down.
            </p>
            <div className="grid gap-1.5">
              <strong className="font-semibold">Which token goes where</strong>
              <ul className="text-muted-foreground list-disc space-y-1.5 pl-5">
                <li>
                  The published site — its <code className="font-mono">CMS_API_TOKEN</code>. Issue
                  it against <strong className="text-foreground">Production site</strong>{' '}
                  (read-only): the site renders, it never edits, so a leaked secret reads only what
                  the site already shows the world.
                </li>
                <li>
                  <code className="font-mono">USER_AGENT_TOKEN</code> — agents and scripts. Issue it
                  against <strong className="text-foreground">Agent</strong> (writes drafts, never
                  publishes): changing live content or publishing is refused.
                </li>
              </ul>
            </div>
            {!canManage && (
              <p className="text-muted-foreground">
                Your role can see these tokens but not issue, reveal or change them (that needs
                settings:write).
              </p>
            )}
          </CardContent>
        </Card>

        {canManage && <IssueForm roles={roles} defaultRoleId={defaultRoleId} />}

        <Card>
          <CardHeader>
            <CardTitle>Live</CardTitle>
          </CardHeader>
          <CardContent>
            {live.length ? (
              <ul className="divide-y">
                {live.map((token) => (
                  <TokenRow key={token.id} token={token} canManage={canManage} />
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={<KeyRound className="size-8" />}
                title="No service tokens yet"
                description={
                  canManage
                    ? 'Issue one above for a published site, a build or an agent.'
                    : 'Someone who manages settings can issue one.'
                }
              />
            )}
          </CardContent>
        </Card>

        {revoked.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Revoked</CardTitle>
              <CardDescription>
                Kept so the audit log can still name the token that acted.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="divide-y">
                {revoked.map((token) => (
                  <TokenRow key={token.id} token={token} canManage={canManage} />
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </SettingsShell>
    </>
  )
}
