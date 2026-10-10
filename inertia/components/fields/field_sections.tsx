import type { ReactNode } from 'react'
import type { Field, FieldData } from '#types/content'
import Postbox from '~/components/admin/postbox'
import FieldsForm from '~/components/fields/fields_form'
import { slugify } from '~/lib/format'

export function splitFields(fields: Field[]) {
  const groups = new Map<string, Field[]>()
  const sidebar: Field[] = []
  for (const field of fields) {
    if (field.sidebar) {
      sidebar.push(field)
      continue
    }
    const tab = field.tab?.trim() || ''
    groups.set(tab, [...(groups.get(tab) ?? []), field])
  }
  return { groups: [...groups.entries()], sidebar }
}

export function FieldPostboxes({
  id,
  fields,
  value,
  onChange,
  path,
  title = 'Fields',
  footer,
}: {
  id: string
  fields: Field[]
  value: FieldData
  onChange: (value: FieldData) => void
  path: string
  title?: string
  footer?: ReactNode
}) {
  const { groups } = splitFields(fields)
  return (
    <>
      {groups.map(([tab, group], index) => (
        <Postbox
          key={tab || '_main'}
          id={tab ? `${id}-${slugify(tab)}` : id}
          title={tab || title}
          footer={index === groups.length - 1 ? footer : undefined}
        >
          <FieldsForm fields={group} value={value} path={path} onChange={onChange} />
        </Postbox>
      ))}
    </>
  )
}

export function SidebarFields({
  fields,
  value,
  onChange,
  path,
}: {
  fields: Field[]
  value: FieldData
  onChange: (value: FieldData) => void
  path: string
}) {
  const { sidebar } = splitFields(fields)
  if (!sidebar.length) return null
  return (
    <div className="grid gap-4 border-t pt-4" data-sidebar-fields>
      <FieldsForm fields={sidebar} value={value} path={path} onChange={onChange} />
    </div>
  )
}
