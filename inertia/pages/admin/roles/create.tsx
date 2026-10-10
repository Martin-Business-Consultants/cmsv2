import { Head } from '@inertiajs/react'
import type { InertiaProps } from '~/types'
import PageHeader from '~/components/admin/page_header'
import RoleForm, { type CapabilityGroups } from '~/components/admin/role_form'
import { urlFor } from '~/client'

type Props = InertiaProps<{ capabilities: CapabilityGroups }>

export default function RolesCreate({ capabilities }: Props) {
  return (
    <>
      <Head title="New role" />
      <PageHeader title="New role" back={{ href: urlFor('admin.roles.index'), label: 'Roles' }} />
      <RoleForm
        initial={{ name: '', description: '', permissions: [] }}
        capabilities={capabilities}
        action={urlFor('admin.roles.store')}
        method="post"
        submitLabel="Create role"
      />
    </>
  )
}
