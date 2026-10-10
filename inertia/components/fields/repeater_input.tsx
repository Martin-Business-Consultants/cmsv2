import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import type { Field, FieldData } from '#types/content'
import { Button } from '~/components/ui/button'
import FieldsForm from '~/components/fields/fields_form'

const TITLE_NAMES = ['title', 'label', 'heading', 'name', 'value']

function summary(fields: Field[], item: FieldData, index: number) {
  const candidates = [
    ...TITLE_NAMES.map((name) => fields.find((field) => field.name === name)),
    ...fields.filter((field) => ['string', 'text'].includes(field.type)),
  ]
  for (const field of candidates) {
    const text = field ? item?.[field.name] : null
    if (typeof text === 'string' && text) return text
    if (field?.type === 'link' && item?.[field.name]?.label) return item[field.name].label
  }
  return `Item ${index + 1}`
}

export default function RepeaterInput({
  field,
  value,
  onChange,
  path,
}: {
  field: Field
  value: FieldData[]
  onChange: (value: FieldData[]) => void
  path: string
}) {
  const fields = field.of ?? []

  function move(index: number, offset: number) {
    const next = [...value]
    const [item] = next.splice(index, 1)
    next.splice(index + offset, 0, item)
    onChange(next)
  }

  return (
    <div className="grid gap-3">
      {value.map((item, index) => (
        <div key={index} className="rounded-lg border">
          <div className="bg-muted/50 flex items-center gap-1 border-b px-3 py-1.5">
            <span className="flex-1 truncate text-sm font-medium">
              {summary(fields, item, index)}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              disabled={index === 0}
              onClick={() => move(index, -1)}
            >
              <ArrowUp />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              disabled={index === value.length - 1}
              onClick={() => move(index, 1)}
            >
              <ArrowDown />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => onChange(value.filter((_, i) => i !== index))}
            >
              <Trash2 />
            </Button>
          </div>
          <div className="p-4">
            <FieldsForm
              fields={fields}
              value={item ?? {}}
              path={`${path}.${index}`}
              onChange={(next) =>
                onChange(value.map((current, i) => (i === index ? next : current)))
              }
            />
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-fit"
        onClick={() => onChange([...value, {}])}
      >
        <Plus />
        Add {field.label?.replace(/s$/, '').toLowerCase() || 'item'}
      </Button>
    </div>
  )
}
