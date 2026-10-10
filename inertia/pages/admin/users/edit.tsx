import { Head, usePage } from '@inertiajs/react'
import { Trash2 } from 'lucide-react'
import type { Data } from '@generated/data'
import type { InertiaProps } from '~/types'
import { Button } from '~/components/ui/button'
import PageHeader from '~/components/admin/page_header'
import ConfirmAction from '~/components/admin/confirm_action'
import UserForm, { type RoleChoice } from '~/components/admin/user_form'
import { useCan } from '~/hooks/use_can'
import { urlFor } from '~/client'

type Props = InertiaProps<{ editing: Data.User; roles: RoleChoice[] }>

export default function UsersEdit({ editing, roles }: Props) {
  const can = useCan()
  const { user: me } = usePage().props
  const name = editing.fullName || editing.email

  return (
    <>
      <Head title={name} />
      <PageHeader
        title={name}
        description={editing.email}
        back={{ href: urlFor('admin.users.index'), label: 'Users' }}
        actions={
          can('users:delete') &&
          editing.id !== me?.id && (
            <ConfirmAction
              href={urlFor('admin.users.destroy', { id: editing.id })}
              title={`Delete ${name}?`}
              description="They lose access immediately. Their past edits and audit history are kept."
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
      <UserForm
        key={editing.id}
        initial={{
          fullName: editing.fullName ?? '',
          email: editing.email,
          roleId: editing.roleId,
          verified: editing.verified,
          password: '',
          passwordConfirmation: '',
        }}
        roles={roles}
        action={urlFor('admin.users.update', { id: editing.id })}
        method="put"
        submitLabel="Save user"
        passwordOptional
        readOnly={!can('users:write')}
      />
    </>
  )
}
