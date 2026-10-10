import { Head } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { RefreshCw } from 'lucide-react'
import type { InertiaProps } from '~/types'
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import ConfirmAction from '~/components/admin/confirm_action'
import CopyField from '~/components/admin/copy_field'
import SettingsShell from '~/components/settings/settings_shell'
import SecretField from '~/components/tokens/secret_field'
import CapabilityGroups from '~/components/tokens/capability_groups'
import { useCan } from '~/hooks/use_can'
import { formatDateTime } from '~/lib/format'

type Props = InertiaProps<{
  token: {
    prefix: string
    masked: string
    visible: boolean
    createdAt: string | null
    lastUsedAt: string | null
    lastUsedIp: string | null
  }
  capabilities: { group: string; capabilities: string[] }[]
  baseUrl: string
}>

export default function ApiTokenSettings({ token, capabilities, baseUrl }: Props) {
  const can = useCan()
  const curl = `curl -H "Authorization: Bearer ${token.prefix}…" \\\n  ${baseUrl}/api/api_tokens/me`
  const install = `curl -fsSL ${baseUrl}/agent/install.sh | sh`

  return (
    <>
      <Head title="API token" />
      <SettingsShell
        title="API token"
        description="Your personal token for the API and the cms CLI."
      >
        <Card>
          <CardHeader>
            <CardTitle>Your token</CardTitle>
            <CardDescription>
              It can do exactly what your role allows — no more — and changes with your role.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <SecretField
              masked={token.masked}
              visible={token.visible}
              revealUrl="/admin/settings/api-token/reveal"
            />
            <p className="text-muted-foreground text-xs" data-testid="token-usage">
              Created {formatDateTime(token.createdAt)} ·{' '}
              {token.lastUsedAt
                ? `last used ${formatDateTime(token.lastUsedAt)}${token.lastUsedIp ? ` from ${token.lastUsedIp}` : ''}`
                : 'never used'}
            </p>
            <div>
              <ConfirmAction
                href="/admin/settings/api-token/rotate"
                method="post"
                title="Rotate this token?"
                description="The current one stops working immediately, and anything using it will start getting 401s."
                confirmLabel="Rotate"
                trigger={
                  <Button variant="outline">
                    <RefreshCw />
                    Rotate token
                  </Button>
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Using it</CardTitle>
            <CardDescription>
              Send it as a bearer token. In an Astro site this is the{' '}
              <code className="font-mono">USER_AGENT_TOKEN</code> value. A published site should use
              a read-only service token instead
              {can('settings:read') ? (
                <>
                  {' '}
                  — see{' '}
                  <Link
                    href="/admin/settings/service-tokens"
                    className="text-foreground underline underline-offset-4"
                  >
                    Service tokens
                  </Link>
                </>
              ) : null}
              .
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted/40 overflow-x-auto rounded-md border px-3 py-2 font-mono text-xs">
              {curl}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Using it from an agent
              <Badge variant="secondary">Coming soon</Badge>
            </CardTitle>
            <CardDescription>
              Run this on your own machine to set up Claude Code, opencode or Codex against this
              workspace. It installs the <code className="font-mono">cms</code> CLI, signs in
              through your browser, and writes an <code className="font-mono">AGENTS.md</code> the
              agent reads.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CopyField value={install} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>What it can do</CardTitle>
            <CardDescription>
              The capabilities your role grants, grouped as on Roles.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CapabilityGroups groups={capabilities} />
          </CardContent>
        </Card>
      </SettingsShell>
    </>
  )
}
