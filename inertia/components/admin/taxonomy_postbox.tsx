import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { router } from '@inertiajs/react'
import { Plus, Tags, X } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio_group'
import Postbox from '~/components/admin/postbox'
import { useCan } from '~/hooks/use_can'
import { cn } from '~/lib/utils'
import { urlFor } from '~/client'

export type TaxonomyTerm = { id: number; slug: string; title: string }

export type TermInput = { id?: number | null; title: string }

export type TaxonomyPool = { id: number; slug: string; name: string; terms: TaxonomyTerm[] }

export type TaxonomyEditor = {
  categories: TaxonomyPool | null
  tags: TaxonomyPool | null
  missing: { categories: string | null; tags: string | null }
  category: TaxonomyTerm | null
  selectedTags: TaxonomyTerm[]
}

export type TaxonomyValue = { category: TermInput | null; tags: TermInput[] }

function termKey(term: TermInput) {
  return term.id ? `id:${term.id}` : `new:${term.title.trim().toLowerCase()}`
}

function sameTerm(a: TermInput, b: TermInput) {
  if (a.id && b.id) return a.id === b.id
  return a.title.trim().toLowerCase() === b.title.trim().toLowerCase()
}

export function taxonomyInitial(taxonomy: TaxonomyEditor | undefined): TaxonomyValue {
  return {
    category: taxonomy?.category
      ? { id: taxonomy.category.id, title: taxonomy.category.title }
      : null,
    tags: (taxonomy?.selectedTags ?? []).map((tag) => ({ id: tag.id, title: tag.title })),
  }
}

export function hasTaxonomy(taxonomy: TaxonomyEditor | undefined, canSetUp: boolean) {
  if (!taxonomy) return false
  return Boolean(
    taxonomy.categories ||
    taxonomy.tags ||
    (canSetUp && (taxonomy.missing.categories || taxonomy.missing.tags))
  )
}

function CategoryChecklist({
  pool,
  value,
  onChange,
  canCreate,
  error,
}: {
  pool: TaxonomyPool
  value: TermInput | null
  onChange: (value: TermInput | null) => void
  canCreate: boolean
  error?: string
}) {
  const id = useId()
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const pending = value && !value.id ? value : null
  const options: TermInput[] = [...pool.terms, ...(pending ? [pending] : [])]
  const selected = value ? termKey(value) : 'none'

  function add() {
    const title = draft.trim()
    if (!title) return
    const existing = pool.terms.find((term) => sameTerm(term, { title }))
    onChange(existing ? { id: existing.id, title: existing.title } : { title })
    setDraft('')
    setAdding(false)
  }

  return (
    <div className="grid gap-2">
      <Label id={`${id}-label`}>Category</Label>
      <RadioGroup
        aria-labelledby={`${id}-label`}
        value={selected}
        onValueChange={(key) =>
          onChange(key === 'none' ? null : (options.find((term) => termKey(term) === key) ?? null))
        }
        className="bg-muted/30 max-h-48 gap-0 overflow-y-auto rounded-md border p-1"
      >
        <label className="hover:bg-muted flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm">
          <RadioGroupItem value="none" />
          <span className="text-muted-foreground">None</span>
        </label>
        {options.map((term) => (
          <label
            key={termKey(term)}
            className="hover:bg-muted flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm"
          >
            <RadioGroupItem value={termKey(term)} />
            <span className="min-w-0 flex-1 truncate">{term.title}</span>
            {!term.id && <span className="text-muted-foreground text-xs">new</span>}
          </label>
        ))}
      </RadioGroup>
      {error && <p className="text-destructive text-xs">{error}</p>}
      {canCreate &&
        (adding ? (
          <div className="flex gap-2">
            <Input
              autoFocus
              aria-label="New category name"
              placeholder="New category name"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  add()
                }
                if (event.key === 'Escape') {
                  event.preventDefault()
                  event.stopPropagation()
                  setAdding(false)
                }
              }}
            />
            <Button type="button" variant="outline" onClick={add} disabled={!draft.trim()}>
              Add
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="text-primary inline-flex w-fit items-center gap-1 text-xs font-medium underline-offset-4 hover:underline"
          >
            <Plus className="size-3.5" />
            Add New Category
          </button>
        ))}
      <p className="text-muted-foreground text-xs">From {pool.name}</p>
    </div>
  )
}

function TagInput({
  pool,
  value,
  onChange,
  canCreate,
  error,
}: {
  pool: TaxonomyPool
  value: TermInput[]
  onChange: (value: TermInput[]) => void
  canCreate: boolean
  error?: string
}) {
  const id = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [showAll, setShowAll] = useState(false)

  const available = useMemo(
    () => pool.terms.filter((term) => !value.some((chosen) => sameTerm(chosen, term))),
    [pool.terms, value]
  )
  const needle = query.trim().toLowerCase()
  const suggestions = needle
    ? available.filter((term) => term.title.toLowerCase().includes(needle)).slice(0, 8)
    : []
  const exact = pool.terms.find((term) => term.title.toLowerCase() === needle)
  const offerCreate =
    canCreate &&
    needle !== '' &&
    !exact &&
    !value.some((chosen) => sameTerm(chosen, { title: query }))
  const items: TermInput[] = [...suggestions, ...(offerCreate ? [{ title: query.trim() }] : [])]

  function choose(term: TermInput) {
    if (!value.some((chosen) => sameTerm(chosen, term))) onChange([...value, term])
    setQuery('')
    setActive(0)
    inputRef.current?.focus()
  }

  function commitTyped() {
    const parts = query
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
    const next = [...value]
    for (const title of parts) {
      const found = pool.terms.find((term) => term.title.toLowerCase() === title.toLowerCase())
      const term: TermInput | null = found
        ? { id: found.id, title: found.title }
        : canCreate
          ? { title }
          : null
      if (term && !next.some((chosen) => sameTerm(chosen, term))) next.push(term)
    }
    onChange(next)
    setQuery('')
    setActive(0)
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' && items.length) {
      event.preventDefault()
      setOpen(true)
      setActive((index) => (index + 1) % items.length)
    } else if (event.key === 'ArrowUp' && items.length) {
      event.preventDefault()
      setActive((index) => (index - 1 + items.length) % items.length)
    } else if (event.key === 'Enter' || event.key === ',') {
      if (!query.trim()) return
      event.preventDefault()
      if (event.key === 'Enter' && open && items[active]) choose(items[active])
      else commitTyped()
    } else if (event.key === 'Backspace' && !query && value.length) {
      onChange(value.slice(0, -1))
    } else if (event.key === 'Escape' && open) {
      event.preventDefault()
      event.stopPropagation()
      setOpen(false)
    }
  }

  return (
    <div className="grid gap-2">
      <Label htmlFor={`${id}-input`}>Tags</Label>
      <div
        className={cn(
          'border-input dark:bg-input/30 relative flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border bg-transparent px-2 py-1.5 shadow-xs',
          'focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]',
          error && 'border-destructive'
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((tag) => (
          <span
            key={termKey(tag)}
            className="bg-secondary text-secondary-foreground inline-flex max-w-full items-center gap-1 rounded-full py-0.5 pr-1 pl-2.5 text-xs font-medium"
          >
            <span className="truncate">{tag.title}</span>
            {!tag.id && <span className="text-muted-foreground">new</span>}
            <button
              type="button"
              aria-label={`Remove ${tag.title}`}
              onClick={(event) => {
                event.stopPropagation()
                onChange(value.filter((chosen) => !sameTerm(chosen, tag)))
              }}
              className="hover:bg-muted-foreground/20 rounded-full p-0.5"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          id={`${id}-input`}
          role="combobox"
          aria-expanded={open && items.length > 0}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          autoComplete="off"
          placeholder={value.length ? '' : canCreate ? 'Add a tag…' : 'Find a tag…'}
          className="placeholder:text-muted-foreground min-w-24 flex-1 bg-transparent py-0.5 text-sm outline-none"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)
            setActive(0)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKeyDown}
        />
        {open && items.length > 0 && (
          <ul
            id={`${id}-list`}
            role="listbox"
            className="bg-popover text-popover-foreground absolute top-full right-0 left-0 z-20 mt-1 max-h-56 overflow-y-auto rounded-md border p-1 shadow-md"
          >
            {items.map((term, index) => (
              <li
                key={termKey(term)}
                role="option"
                aria-selected={index === active}
                onMouseDown={(event) => {
                  event.preventDefault()
                  choose(term.id ? { id: term.id, title: term.title } : term)
                }}
                onMouseEnter={() => setActive(index)}
                className={cn(
                  'cursor-pointer rounded px-2 py-1.5 text-sm',
                  index === active && 'bg-accent text-accent-foreground'
                )}
              >
                {term.id ? (
                  term.title
                ) : (
                  <span className="inline-flex items-center gap-1.5">
                    <Plus className="size-3.5" />
                    Add “{term.title}”
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      {error && <p className="text-destructive text-xs">{error}</p>}
      <p className="text-muted-foreground text-xs">
        {canCreate ? 'Separate tags with commas or Enter. ' : ''}From {pool.name}
      </p>
      {available.length > 0 && (
        <div className="grid gap-2">
          <button
            type="button"
            onClick={() => setShowAll((shown) => !shown)}
            aria-expanded={showAll}
            className="text-primary w-fit text-xs font-medium underline-offset-4 hover:underline"
          >
            {showAll ? 'Hide existing tags' : 'Choose from existing tags'}
          </button>
          {showAll && (
            <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
              {available.map((term) => (
                <button
                  key={term.id}
                  type="button"
                  onClick={() => choose({ id: term.id, title: term.title })}
                  className="hover:bg-secondary rounded-full border px-2.5 py-0.5 text-xs"
                >
                  {term.title}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function TaxonomyPostbox({
  id,
  taxonomy,
  value,
  onChange,
  errors,
}: {
  id: string
  taxonomy: TaxonomyEditor
  value: TaxonomyValue
  onChange: (value: TaxonomyValue) => void
  errors: { category?: string; tags?: string }
}) {
  const can = useCan()
  const canCreate = can('entries:write') && can('entries:publish')
  const missing = taxonomy.missing.categories || taxonomy.missing.tags
  const [creating, setCreating] = useState(false)

  return (
    <Postbox id={id} title="Categories & Tags">
      {taxonomy.categories && (
        <CategoryChecklist
          pool={taxonomy.categories}
          value={value.category}
          onChange={(category) => onChange({ ...value, category })}
          canCreate={canCreate}
          error={errors.category}
        />
      )}
      {taxonomy.tags && (
        <TagInput
          pool={taxonomy.tags}
          value={value.tags}
          onChange={(tags) => onChange({ ...value, tags })}
          canCreate={canCreate}
          error={errors.tags}
        />
      )}
      {missing && can('collections:write') && (
        <div className="bg-muted/40 grid gap-2 rounded-md border border-dashed p-3 text-xs">
          <p className="text-muted-foreground flex gap-2">
            <Tags className="mt-0.5 size-3.5 shrink-0" />
            <span>
              Pages take categories from a <code className="font-mono">page-categories</code>{' '}
              collection and tags from <code className="font-mono">page-tags</code>.
            </span>
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-fit"
            disabled={creating}
            onClick={() =>
              router.post(
                urlFor('admin.taxonomy_pools.pages'),
                {},
                {
                  preserveScroll: true,
                  onStart: () => setCreating(true),
                  onFinish: () => setCreating(false),
                }
              )
            }
          >
            {creating ? 'Setting up…' : 'Set up categories & tags'}
          </Button>
        </div>
      )}
    </Postbox>
  )
}
