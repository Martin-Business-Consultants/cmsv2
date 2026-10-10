import { Head } from '@inertiajs/react'
import { Lock, Shield } from 'lucide-react'
import type { Data } from '@generated/data'
import type { InertiaProps } from '~/types'
import { Badge } from '~/components/ui/badge'
import {
  BulkActions,
  ListEmpty,
  ListHeader,
  ListSearch,
  ListTable,
  ListToolbar,
  Pagination,
  RowAction,
  RowActionConfirm,
  RowActions,
  RowTitle,
  ScreenOptions,
  StatusLinks,
  useScreenOptions,
  useSelection,
  type Column,
  type ListMeta,
} from '~/components/admin/list'
import { useCan } from '~/hooks/use_can'
import { urlFor } from '~/client'

type Role = Data.Role.Variants['forList']

type Props = InertiaProps<{
  roles: Role[]
  meta: ListMeta
  counts: { all: number; system: number; custom: number }
  filters: { search: string; type: string; sort: string; order: 'asc' | 'desc' }
}>

export default function RolesIndex({ roles, meta, counts, filters }: Props) {
  const can = useCan()
  const canWrite = can('roles:write')
  const canDelete = can('roles:delete')
  const selection = useSelection(roles.map((role) => role.id))

  const columns: Column<Role>[] = [
    {
      id: 'name',
      label: 'Role',
      primary: true,
      sort: 'name',
      cell: (role) => {
        const locked = role.isSystem || role.isAdmin
        const inUse = role.usersCount + role.serviceTokensCount > 0
        const edit = urlFor('admin.roles.edit', { id: role.id })
        return (
          <>
            <div className="flex items-center gap-2">
              <RowTitle href={edit}>{role.name}</RowTitle>
              {locked && <Lock className="text-muted-foreground size-3.5" aria-label="Built-in" />}
            </div>
            {role.description && (
              <p className="text-muted-foreground text-xs">{role.description}</p>
            )}
            <RowActions>
              <RowAction href={edit} keys="e">
                {canWrite && !locked ? 'Edit' : 'View'}
              </RowAction>
              {role.usersCount > 0 && can('users:read') && (
                <RowAction href={urlFor('admin.users.index', {}, { qs: { role: role.id } })}>
                  Users
                </RowAction>
              )}
              {canDelete && !locked && !inUse && (
                <RowActionConfirm
                  href={urlFor('admin.roles.destroy', { id: role.id })}
                  title={`Delete the ${role.name} role?`}
                  description="Nobody uses it, so nothing else changes."
                  confirmLabel="Delete"
                  keys="d"
                >
                  Delete
                </RowActionConfirm>
              )}
            </RowActions>
          </>
        )
      },
    },
    {
      id: 'permissions',
      label: 'Permissions',
      cell: (role) =>
        role.isAdmin ? (
          <Badge>Everything</Badge>
        ) : (
          <Badge variant="secondary">{role.permissions.length} capabilities</Badge>
        ),
    },
    {
      id: 'users',
      label: 'Users',
      sort: 'users',
      defaultOrder: 'desc',
      className: 'tabular-nums',
      cell: (role) => role.usersCount,
    },
    {
      id: 'tokens',
      label: 'Service tokens',
      className: 'tabular-nums',
      cell: (role) => role.serviceTokensCount,
    },
  ]
  const screen = useScreenOptions('roles', columns)

  return (
    <>
      <Head title="Roles" />
      <ListHeader
        title="Roles"
        addNew={canWrite && { href: urlFor('admin.roles.create'), label: 'Add New Role' }}
        search={filters.search}
        description="Bundles of permissions for users and API clients."
        aside={<ScreenOptions screen={screen} />}
      />
      <StatusLinks
        param="type"
        current={filters.type}
        options={[
          { label: 'All', value: '', count: counts.all },
          { label: 'Built-in', value: 'system', count: counts.system },
          { label: 'Custom', value: 'custom', count: counts.custom },
        ]}
      />
      <ListToolbar search={<ListSearch value={filters.search} placeholder="Search roles…" />}>
        <BulkActions
          url={urlFor('admin.roles.bulk')}
          selection={selection}
          noun={['role', 'roles']}
          actions={[
            canDelete && {
              value: 'delete',
              label: 'Delete',
              destructive: true,
              confirm: {
                title: 'Delete {count} {noun}?',
                description: 'Built-in roles and roles still assigned to someone are skipped.',
                label: 'Delete',
              },
            },
          ]}
        />
      </ListToolbar>
      {roles.length === 0 ? (
        <ListEmpty
          filtered={Boolean(filters.search || filters.type)}
          resetHref={urlFor('admin.roles.index')}
          icon={<Shield className="size-8" />}
          title="No roles yet"
        />
      ) : (
        <ListTable
          rows={roles}
          rowKey={(role) => role.id}
          rowLabel={(role) => role.name}
          columns={columns}
          screen={screen}
          selection={canDelete ? selection : null}
          sort={filters}
        />
      )}
      <Pagination meta={meta} />
    </>
  )
}
