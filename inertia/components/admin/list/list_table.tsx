import type { ReactNode } from 'react'
import { Link } from '@adonisjs/inertia/react'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table'
import { cn } from '~/lib/utils'
import { useListUrl, type SortState } from './query'
import SelectCheckbox from './select_checkbox'
import type { Screen } from './screen_options'
import type { RowKey, Selection } from './use_selection'

export type Column<T> = {
  id: string
  label: string
  primary?: boolean
  hidden?: boolean
  sort?: string
  defaultOrder?: 'asc' | 'desc'
  className?: string
  headClassName?: string
  cell: (row: T) => ReactNode
}

function SortHeader({
  label,
  sortKey,
  sort,
  defaultOrder = 'asc',
}: {
  label: string
  sortKey: string
  sort: SortState
  defaultOrder?: 'asc' | 'desc'
}) {
  const { href } = useListUrl()
  const active = sort.sort === sortKey
  const next = active ? (sort.order === 'asc' ? 'desc' : 'asc') : defaultOrder
  const Icon = active ? (sort.order === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown

  return (
    <Link
      href={href({ sort: sortKey, order: next })}
      preserveScroll
      className={cn(
        'hover:text-foreground -mx-1 inline-flex items-center gap-1 rounded px-1',
        active && 'text-foreground'
      )}
      aria-label={`Sort by ${label} ${next === 'asc' ? 'ascending' : 'descending'}`}
    >
      {label}
      <Icon className={cn('size-3.5', !active && 'opacity-40')} />
    </Link>
  )
}

export default function ListTable<T, K extends RowKey>({
  rows,
  rowKey,
  rowLabel,
  columns,
  screen,
  selection,
  sort,
  rowClassName,
}: {
  rows: T[]
  rowKey: (row: T) => K
  rowLabel: (row: T) => string
  columns: Column<T>[]
  screen?: Screen
  selection?: Selection<K> | null
  sort?: SortState
  rowClassName?: (row: T) => string | undefined
}) {
  const visible = columns.filter((column) => !screen || screen.isVisible(column.id))

  return (
    <div className="bg-card rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {selection && (
              <TableHead className="w-10 pr-0 pl-4">
                <SelectCheckbox
                  checked={selection.allState}
                  onCheckedChange={selection.toggleAll}
                  label="Select all"
                  data-list-select-all
                />
              </TableHead>
            )}
            {visible.map((column) => (
              <TableHead
                key={column.id}
                aria-sort={
                  sort && column.sort && sort.sort === column.sort
                    ? sort.order === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : undefined
                }
                className={cn(!selection && column === visible[0] && 'pl-4', column.headClassName)}
              >
                {column.sort && sort ? (
                  <SortHeader
                    label={column.label}
                    sortKey={column.sort}
                    sort={sort}
                    defaultOrder={column.defaultOrder}
                  />
                ) : (
                  column.label
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const key = rowKey(row)
            const selected = selection?.isSelected(key) ?? false
            return (
              <TableRow
                key={key}
                data-list-item
                data-state={selected ? 'selected' : undefined}
                className={cn(
                  'group/row data-[keyboard-current]:bg-muted/70 outline-none data-[keyboard-current]:shadow-[inset_3px_0_0_var(--color-primary)]',
                  rowClassName?.(row)
                )}
              >
                {selection && (
                  <TableCell className="w-10 pr-0 pl-4 align-top">
                    <div className="pt-0.5">
                      <SelectCheckbox
                        checked={selected}
                        onCheckedChange={() => selection.toggle(key)}
                        label={`Select ${rowLabel(row)}`}
                        data-list-select
                      />
                    </div>
                  </TableCell>
                )}
                {visible.map((column) => (
                  <TableCell
                    key={column.id}
                    className={cn(
                      'align-top',
                      column.primary && 'min-w-48 whitespace-normal',
                      !selection && column === visible[0] && 'pl-4',
                      column.className
                    )}
                  >
                    {column.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
