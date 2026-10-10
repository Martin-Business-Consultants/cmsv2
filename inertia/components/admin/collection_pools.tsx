import type { CollectionOption } from '#types/content'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import FormField from '~/components/admin/form_field'

const NONE = '__none__'

function PoolSelect({
  id,
  label,
  value,
  options,
  error,
  onChange,
}: {
  id: string
  label: string
  value: string | null | undefined
  options: CollectionOption[]
  error?: string
  onChange: (value: string | null) => void
}) {
  return (
    <FormField label={label} htmlFor={id} error={error}>
      <Select value={value || NONE} onValueChange={(next) => onChange(next === NONE ? null : next)}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>None</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.slug} value={option.slug}>
              {option.name} <span className="text-muted-foreground font-mono">{option.slug}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormField>
  )
}

export default function CollectionPools({
  slug,
  collections,
  categories,
  tags,
  errors,
  onChange,
}: {
  slug: string
  collections: CollectionOption[]
  categories: string | null | undefined
  tags: string | null | undefined
  errors: { categories?: string; tags?: string }
  onChange: (changes: {
    categoriesCollection?: string | null
    tagsCollection?: string | null
  }) => void
}) {
  const options = collections.filter((option) => option.slug !== slug)

  return (
    <Card className="gap-3 py-4">
      <CardHeader className="px-4">
        <CardTitle className="text-sm">Categories & tags</CardTitle>
        <CardDescription className="text-xs">
          Entries pick one category and any tags from the entries of these collections.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 px-4">
        <PoolSelect
          id="categoriesCollection"
          label="Categories from"
          value={categories}
          options={options}
          error={errors.categories}
          onChange={(value) => onChange({ categoriesCollection: value })}
        />
        <PoolSelect
          id="tagsCollection"
          label="Tags from"
          value={tags}
          options={options}
          error={errors.tags}
          onChange={(value) => onChange({ tagsCollection: value })}
        />
      </CardContent>
    </Card>
  )
}
