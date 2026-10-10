import type { ReactNode } from 'react'

export default function ListToolbar({
  children,
  search,
}: {
  children?: ReactNode
  search?: ReactNode
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2">{children}</div>
      {search && <div className="ml-auto w-full sm:w-auto">{search}</div>}
    </div>
  )
}
