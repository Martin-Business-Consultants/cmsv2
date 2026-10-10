import { Head } from '@inertiajs/react'
import { Lock, Trash2 } from 'lucide-react'
import type { Data } from '@generated/data'
import type { InertiaProps } from '~/types'
import { Button } from '~/components/ui/button'
import PageHeader from '~/components/admin/page_header'
import ConfirmAction from '~/components/admin/confirm_action'
import RoleForm, { type CapabilityGroups } from '~/components/admin/role_form'
import { useCan } from '~/hooks/use_can'
import { urlFor } from '~/client'

type Props = InertiaProps<{ role: Data.Role; capabilities: CapabilityGroups }>

export default function RolesEdit({ role, capabilities }: Props) {
  const can = useCan()
  const locked = role.isSystem || role.isAdmin

  return (
    <>
      <Head title={role.name} />
      <PageHeader
        title={role.name}
        description={role.description}
        back={{ href: urlFor('admin.roles.index'), label: 'Roles' }}
        actions={
          can('roles:delete') &&
          !locked && (
            <ConfirmAction
              href={urlFor('admin.roles.destroy', { id: role.id })}
              title={`Delete the ${role.name} role?`}
              description="Roles still assigned to users or API clients can't be deleted."
              trigger={
                <Button variant="outline">
                  <Trash2 />
                  Delete
                </Button>
              }
            />
          )
        }
      />
      {locked && (
        <div className="bg-muted/50 mb-6 flex max-w-2xl items-start gap-3 rounded-lg border p-4 text-sm">
          <Lock className="text-muted-foreground mt-0.5 size-4 shrink-0" />
          <p>
            This is a system role with full access to everything. It can’t be edited or deleted.
          </p>
        </div>
      )}
      {role.isAdmin ? null : (
        <RoleForm
          key={role.id}
          initial={{
            name: role.name,
            description: role.description ?? '',
            permissions: role.permissions as string[],
          }}
          capabilities={capabilities}
          action={urlFor('admin.roles.update', { id: role.id })}
          method="put"
          submitLabel="Save role"
          readOnly={locked || !can('roles:write')}
        />
      )}
    </>
  )
}
