import { Head } from '@inertiajs/react'
import type { InertiaProps } from '~/types'
import PageHeader from '~/components/admin/page_header'
import UserForm, { type RoleChoice } from '~/components/admin/user_form'
import { urlFor } from '~/client'

type Props = InertiaProps<{ roles: RoleChoice[] }>

export default function UsersCreate({ roles }: Props) {
  return (
    <>
      <Head title="New user" />
      <PageHeader title="New user" back={{ href: urlFor('admin.users.index'), label: 'Users' }} />
      <UserForm
        initial={{
          fullName: '',
          email: '',
          roleId: null,
          verified: false,
          password: '',
          passwordConfirmation: '',
        }}
        roles={roles}
        action={urlFor('admin.users.store')}
        method="post"
        submitLabel="Create user"
      />
    </>
  )
}
