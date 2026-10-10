import type { EntryOption, LinkValue, PageOption } from '#types/content'
import { Input } from '~/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import ReferenceCombobox from '~/components/fields/reference_combobox'
import { urlFor } from '~/client'

export default function LinkInput({
  value,
  onChange,
}: {
  value: LinkValue | null
  onChange: (value: LinkValue | null) => void
}) {
  const link: LinkValue | null = value?.kind ? value : null
  const update = (changes: Partial<LinkValue>) =>
    onChange({ ...(link ?? { kind: 'url', value: '' }), ...changes })

  return (
    <div className="grid gap-2 sm:grid-cols-[8rem_1fr]">
      <Select
        value={link?.kind ?? 'none'}
        onValueChange={(kind) =>
          kind === 'none'
            ? onChange(null)
            : onChange({ kind: kind as LinkValue['kind'], value: '', label: link?.label })
        }
      >
        <SelectTrigger className="w-full" aria-label="Link type">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No link</SelectItem>
          <SelectItem value="url">URL</SelectItem>
          <SelectItem value="page">Page</SelectItem>
          <SelectItem value="entry">Entry</SelectItem>
        </SelectContent>
      </Select>
      {!link && <p className="text-muted-foreground self-center text-sm">Nothing is linked.</p>}
      {link?.kind === 'url' && (
        <Input
          value={link.value}
          placeholder="https://… or /path"
          onChange={(event) => update({ value: event.target.value })}
        />
      )}
      {link?.kind === 'page' && (
        <ReferenceCombobox<PageOption>
          url={urlFor('admin.lookups.pages')}
          value={link.value ? Number(link.value) : null}
          onChange={(id) => update({ value: id ? String(id) : '' })}
          label={(page) => page.title}
          detail={(page) => `/${page.path === 'home' ? '' : page.path}`}
          placeholder="Choose a page…"
        />
      )}
      {link?.kind === 'entry' && (
        <ReferenceCombobox<EntryOption>
          url={urlFor('admin.lookups.entries')}
          value={link.value ? Number(link.value) : null}
          onChange={(id) => update({ value: id ? String(id) : '' })}
          label={(entry) => entry.title}
          detail={(entry) => entry.collectionName}
          placeholder="Choose an entry…"
        />
      )}
      {link && (
        <Input
          className="sm:col-span-2"
          value={link.label ?? ''}
          placeholder="Link text (optional)"
          onChange={(event) => update({ label: event.target.value })}
        />
      )}
    </div>
  )
}
