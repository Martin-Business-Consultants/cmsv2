import type { Field } from '#types/content'
import ReferenceCombobox from '~/components/fields/reference_combobox'
import { useCan } from '~/hooks/use_can'
import { useEnabledPlugins } from '~/hooks/use_slot'
import { Input } from '~/components/ui/input'
import type { FormOption } from '../../app/types'

export default function FormInput({
  value,
  onChange,
}: {
  field: Field
  value: unknown
  onChange: (value: unknown) => void
  path: string
}) {
  const can = useCan()
  const enabled = useEnabledPlugins().has('forms')
  const id = Number(value) || null

  if (!enabled) {
    return (
      <div className="grid gap-1.5">
        <Input disabled value={id ? `Form #${id}` : 'No form'} />
        <p className="text-muted-foreground text-xs">
          The Forms plugin is off. Switch it on in Plugins to pick a form.
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-1.5">
      <ReferenceCombobox<FormOption>
        url="/admin/lookups/forms"
        value={id}
        onChange={onChange}
        label={(option) => option.title}
        detail={(option) =>
          `/forms/${option.slug}${option.status === 'draft' ? ' · draft, not accepting submissions' : ''}`
        }
        placeholder="Choose a form…"
      />
      {can('forms:write') && (
        <p className="text-muted-foreground text-xs">
          {id ? (
            <a href={`/admin/forms/${id}/edit`} className="hover:text-foreground underline">
              Edit this form
            </a>
          ) : (
            <a href="/admin/forms/new" className="hover:text-foreground underline">
              Build a new form
            </a>
          )}
        </p>
      )}
    </div>
  )
}
