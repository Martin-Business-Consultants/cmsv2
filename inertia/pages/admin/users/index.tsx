import { Head, usePage } from '@inertiajs/react'
import { Users } from 'lucide-react'
import type { Data } from '@generated/data'
import type { InertiaProps } from '~/types'
import { Badge } from '~/components/ui/badge'
import { Avatar, AvatarFallback } from '~/components/ui/avatar'
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
import { formatDate } from '~/lib/format'
import { urlFor } from '~/client'

type User = Data.User

type Props = InertiaProps<{
  users: User[]
  meta: ListMeta
  roles: { id: number; name: string; count: number }[]
  total: number
  filters: { search: string; role: string; sort: string; order: 'asc' | 'desc' }
}>

export default function UsersIndex({ users, meta, roles, total, filters }: Props) {
  const can = useCan()
  const { user: me } = usePage().props
  const canWrite = can('users:write')
  const canDelete = can('users:delete')
  const selection = useSelection(users.map((user) => user.id))

  const columns: Column<User>[] = [
    {
      id: 'name',
      label: 'Name',
      primary: true,
      sort: 'name',
      cell: (user) => {
        const edit =
          user.id === me?.id ? '/admin/account' : urlFor('admin.users.edit', { id: user.id })
        return (
          <div className="flex items-start gap-3">
            <Avatar className="size-8">
              <AvatarFallback className="text-xs">{user.initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <RowTitle href={edit}>{user.fullName || user.email}</RowTitle>
                {user.id === me?.id && <Badge variant="outline">You</Badge>}
              </div>
              <RowActions>
                {(canWrite || user.id === me?.id) && (
                  <RowAction href={edit} keys="e">
                    {user.id === me?.id ? 'Profile' : 'Edit'}
                  </RowAction>
                )}
                {canDelete && user.id !== me?.id && (
                  <RowActionConfirm
                    href={urlFor('admin.users.destroy', { id: user.id })}
                    title={`Delete ${user.fullName || user.email}?`}
                    description="They lose access immediately. Their past edits and audit history are kept."
                    confirmLabel="Delete"
                    keys="d"
                  >
                    Delete
                  </RowActionConfirm>
                )}
              </RowActions>
            </div>
          </div>
        )
      },
    },
    {
      id: 'email',
      label: 'Email',
      sort: 'email',
      className: 'text-muted-foreground',
      cell: (user) => user.email,
    },
    {
      id: 'role',
      label: 'Role',
      cell: (user) =>
        user.roleName ? (
          <Badge variant="secondary">{user.roleName}</Badge>
        ) : (
          <span className="text-muted-foreground text-sm">No role</span>
        ),
    },
    {
      id: 'created',
      label: 'Created',
      sort: 'created',
      defaultOrder: 'desc',
      className: 'text-muted-foreground text-sm whitespace-nowrap',
      cell: (user) => formatDate(user.createdAt),
    },
  ]
  const screen = useScreenOptions('users', columns)

  return (
    <>
      <Head title="Users" />
      <ListHeader
        title="Users"
        addNew={canWrite && { href: urlFor('admin.users.create'), label: 'Add New User' }}
        search={filters.search}
        description="People who can sign in to the admin."
        aside={<ScreenOptions screen={screen} />}
      />
      <StatusLinks
        param="role"
        current={filters.role}
        options={[
          { label: 'All', value: '', count: total },
          ...roles.map((role) => ({ label: role.name, value: String(role.id), count: role.count })),
        ]}
      />
      <ListToolbar search={<ListSearch value={filters.search} placeholder="Search users…" />}>
        <BulkActions
          url={urlFor('admin.users.bulk')}
          selection={selection}
          noun={['user', 'users']}
          actions={[
            canDelete && {
              value: 'delete',
              label: 'Delete',
              destructive: true,
              confirm: {
                title: 'Delete {count} {noun}?',
                description:
                  'They lose access immediately. You, and the last admin, are always skipped.',
                label: 'Delete',
              },
            },
          ]}
        />
      </ListToolbar>
      {users.length === 0 ? (
        <ListEmpty
          filtered={Boolean(filters.search || filters.role)}
          resetHref={urlFor('admin.users.index')}
          icon={<Users className="size-8" />}
          title="No users yet"
        />
      ) : (
        <ListTable
          rows={users}
          rowKey={(user) => user.id}
          rowLabel={(user) => user.fullName || user.email}
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
