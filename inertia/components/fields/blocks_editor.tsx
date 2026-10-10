import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, Copy, Plus, Trash2 } from 'lucide-react'
import type { Block, BlockTypeOption, Field, FieldData } from '#types/content'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import Icon from '~/components/admin/dynamic_icon'
import FieldsForm from '~/components/fields/fields_form'
import { useFields } from '~/components/fields/context'
import { errorsUnder } from '~/lib/errors'
import { newId } from '~/lib/format'
import { cn } from '~/lib/utils'

const SUMMARY_NAMES = ['title', 'label', 'name', 'heading', 'text', 'value']

function summary(type: BlockTypeOption | undefined, data: FieldData) {
  const named = SUMMARY_NAMES.map((name) => data?.[name]).find(
    (value) => typeof value === 'string' && value.trim()
  )
  const field = type?.fields.find(
    (candidate: Field) => candidate.type === 'string' && typeof data?.[candidate.name] === 'string'
  )
  const text = named ?? (field ? data?.[field.name] : '')
  if (typeof text !== 'string') return ''
  const plain = text.replace(/<[^>]*>/g, '').trim()
  return plain.length > 80 ? `${plain.slice(0, 79)}…` : plain
}

function TypeButton({ type, onPick }: { type: BlockTypeOption; onPick: () => void }) {
  return (
    <button
      type="button"
      onClick={onPick}
      data-block-type={type.slug}
      className="hover:bg-accent flex items-start gap-3 rounded-lg border p-3 text-left"
    >
      <div className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-md">
        <Icon name={type.icon} className="size-4" />
      </div>
      <div className="min-w-0">
        <div className="text-sm font-medium">{type.label}</div>
        {type.description && (
          <div className="text-muted-foreground line-clamp-2 text-xs">{type.description}</div>
        )}
      </div>
    </button>
  )
}

export function BlockPicker({
  open,
  onOpenChange,
  onPick,
  allowedTypes,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPick: (type: BlockTypeOption) => void
  allowedTypes?: string[]
}) {
  const { blockTypes } = useFields()
  const [search, setSearch] = useState('')

  const { groups, deprecated } = useMemo(() => {
    const term = search.toLowerCase()
    const visible = blockTypes.filter(
      (type) =>
        (!allowedTypes?.length || allowedTypes.includes(type.slug)) &&
        (!term ||
          type.label.toLowerCase().includes(term) ||
          type.slug.toLowerCase().includes(term) ||
          type.description?.toLowerCase().includes(term))
    )
    const byCategory = new Map<string, BlockTypeOption[]>()
    for (const type of visible.filter((candidate) => !candidate.deprecated)) {
      const category = type.category || 'Other'
      byCategory.set(category, [...(byCategory.get(category) ?? []), type])
    }
    return {
      groups: [...byCategory.entries()],
      deprecated: visible.filter((candidate) => candidate.deprecated),
    }
  }, [blockTypes, allowedTypes, search])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Add a block</DialogTitle>
          <DialogDescription>Pick a section to add to the page.</DialogDescription>
        </DialogHeader>
        <Input
          autoFocus
          placeholder="Search blocks…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <div className="max-h-[60vh] space-y-5 overflow-y-auto pr-1">
          {groups.map(([category, types]) => (
            <div key={category}>
              <h3 className="text-muted-foreground mb-2 text-xs font-semibold uppercase tracking-wide">
                {category}
              </h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {types.map((type) => (
                  <TypeButton key={type.slug} type={type} onPick={() => onPick(type)} />
                ))}
              </div>
            </div>
          ))}
          {deprecated.length > 0 && (
            <details className="group space-y-2" data-deprecated-blocks open={Boolean(search)}>
              <summary className="text-muted-foreground cursor-pointer text-xs font-semibold tracking-wide uppercase">
                Deprecated ({deprecated.length})
              </summary>
              <p className="text-muted-foreground text-xs">
                Kept for content that already uses them. They’re still added like any other, but a
                newer type usually does the same job.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {deprecated.map((type) => (
                  <TypeButton key={type.slug} type={type} onPick={() => onPick(type)} />
                ))}
              </div>
            </details>
          )}
          {groups.length === 0 && deprecated.length === 0 && (
            <p className="text-muted-foreground py-8 text-center text-sm">No block types match.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function BlocksEditor({
  value,
  onChange,
  path,
  allowedTypes,
}: {
  value: Block[]
  onChange: (value: Block[]) => void
  path: string
  allowedTypes?: string[]
}) {
  const { blockTypes, errors } = useFields()
  const [picking, setPicking] = useState<number | null>(null)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const types = useMemo(() => new Map(blockTypes.map((type) => [type.slug, type])), [blockTypes])

  function insert(type: BlockTypeOption, at: number) {
    const block: Block = {
      id: newId(),
      type: type.slug,
      version: type.version ?? 1,
      data: structuredClone(type.defaults ?? {}),
    }
    const next = [...value]
    next.splice(at, 0, block)
    onChange(next)
  }

  function move(index: number, offset: number) {
    const next = [...value]
    const [block] = next.splice(index, 1)
    next.splice(index + offset, 0, block)
    onChange(next)
  }

  function duplicate(index: number) {
    const next = [...value]
    next.splice(index + 1, 0, { ...structuredClone(value[index]), id: newId() })
    onChange(next)
  }

  return (
    <div className="grid gap-3">
      {value.map((block, index) => {
        const type = types.get(block.type)
        const at = `${path}.${index}`
        const hasErrors = errorsUnder(errors, at).length > 0
        const isCollapsed = collapsed[block.id] && !hasErrors
        return (
          <div
            key={block.id}
            className={cn('bg-card rounded-xl border shadow-xs', hasErrors && 'border-destructive')}
          >
            <div className="flex items-center gap-2 px-3 py-2">
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
                onClick={() => setCollapsed({ ...collapsed, [block.id]: !isCollapsed })}
              >
                {isCollapsed ? (
                  <ChevronRight className="size-4 shrink-0" />
                ) : (
                  <ChevronDown className="size-4 shrink-0" />
                )}
                <Icon name={type?.icon} className="text-muted-foreground size-4 shrink-0" />
                <span className="text-sm font-medium">{type?.label ?? block.type}</span>
                {type?.deprecated && (
                  <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[11px]">
                    Deprecated
                  </span>
                )}
                <span className="text-muted-foreground truncate text-sm">
                  {summary(type, block.data)}
                </span>
              </button>
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
                onClick={() => duplicate(index)}
              >
                <Copy />
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
            {!isCollapsed && (
              <div className="border-t p-4">
                {type ? (
                  <FieldsForm
                    fields={type.fields}
                    value={block.data ?? {}}
                    path={`${at}.data`}
                    onChange={(data) =>
                      onChange(
                        value.map((current, i) => (i === index ? { ...current, data } : current))
                      )
                    }
                  />
                ) : (
                  <p className="text-destructive text-sm">
                    This block’s type “{block.type}” no longer exists. Its content is kept as it is.
                  </p>
                )}
              </div>
            )}
          </div>
        )
      })}
      <Button
        type="button"
        variant="outline"
        className="w-full border-dashed"
        onClick={() => setPicking(value.length)}
      >
        <Plus />
        Add block
      </Button>
      <BlockPicker
        open={picking !== null}
        onOpenChange={(open) => !open && setPicking(null)}
        allowedTypes={allowedTypes}
        onPick={(type) => {
          insert(type, picking ?? value.length)
          setPicking(null)
        }}
      />
    </div>
  )
}
