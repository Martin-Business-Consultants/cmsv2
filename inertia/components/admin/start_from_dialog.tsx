import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { useForm } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { Check, File, Library, Plus } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import FormField from '~/components/admin/form_field'
import Icon from '~/components/admin/dynamic_icon'
import { cn } from '~/lib/utils'
import { slugify } from '~/lib/format'
import { urlFor } from '~/client'

export type PageTemplateOption = {
  key: string
  title: string
  slug: string
  description: string
  icon: string
  blocks: string[]
}

export type CollectionTemplateOption = {
  key: string
  name: string
  singularName: string
  slug: string
  description: string
  icon: string
  fields: string[]
}

type Card = { key: string; title: string; description: string; icon: ReactNode; meta: string }

function TemplateCards({
  cards,
  value,
  onChange,
}: {
  cards: Card[]
  value: string
  onChange: (key: string) => void
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Start from"
      className="grid max-h-[46vh] gap-2 overflow-y-auto p-0.5 sm:grid-cols-2"
    >
      {cards.map((card) => {
        const selected = card.key === value
        return (
          <button
            key={card.key || 'blank'}
            type="button"
            role="radio"
            aria-checked={selected}
            data-template={card.key || 'blank'}
            onClick={() => onChange(card.key)}
            className={cn(
              'hover:bg-accent/50 focus-visible:ring-ring/50 relative flex gap-3 rounded-lg border p-3 text-left transition-colors outline-none focus-visible:ring-[3px]',
              selected && 'border-primary bg-accent/40 ring-primary ring-1'
            )}
          >
            <span className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-md">
              {card.icon}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">{card.title}</span>
              <span className="text-muted-foreground line-clamp-2 block text-xs">
                {card.description}
              </span>
              {card.meta && (
                <span className="text-muted-foreground/80 mt-1 block truncate text-[11px]">
                  {card.meta}
                </span>
              )}
            </span>
            {selected && <Check className="text-primary absolute top-2 right-2 size-4" />}
          </button>
        )
      })}
    </div>
  )
}

function OtherErrors({ errors, shown }: { errors: Record<string, string>; shown: string[] }) {
  const messages = Object.entries(errors).filter(([key]) => !shown.includes(key))
  if (!messages.length) return null
  return (
    <ul className="text-destructive grid gap-0.5 text-xs">
      {messages.map(([key, message]) => (
        <li key={key}>{message}</li>
      ))}
    </ul>
  )
}

function useOpenFromQuery(setOpen: (open: boolean) => void) {
  useEffect(() => {
    const url = new URL(window.location.href)
    if (url.searchParams.get('new') !== '1') return
    setOpen(true)
    url.searchParams.delete('new')
    window.history.replaceState(window.history.state, '', url.toString())
  }, [setOpen])
}

function TriggerButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button variant="outline" size="sm" onClick={onClick} data-keys="n" title={`${label} (n)`}>
      <Plus />
      {label}
    </Button>
  )
}

export function NewPageDialog({ templates }: { templates: PageTemplateOption[] }) {
  const [open, setOpen] = useState(false)
  const [slugTouched, setSlugTouched] = useState(false)
  const form = useForm({
    title: '',
    slug: '',
    template: '',
    blocks: [] as string[],
    seo: {} as Record<string, string>,
  })
  useOpenFromQuery(setOpen)

  const template = templates.find((item) => item.key === form.data.template)
  const cards: Card[] = [
    {
      key: '',
      title: 'Blank page',
      description: 'Start with no blocks and add your own.',
      icon: <File className="size-4" />,
      meta: '',
    },
    ...templates.map((item) => ({
      key: item.key,
      title: item.title,
      description: item.description,
      icon: <Icon name={item.icon} className="size-4" />,
      meta: item.blocks.join(' · '),
    })),
  ]

  const changeOpen = (next: boolean) => {
    setOpen(next)
    if (!next) {
      form.reset()
      form.clearErrors()
      setSlugTouched(false)
    }
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    form.post(urlFor('admin.pages.store'), { preserveScroll: true })
  }

  return (
    <>
      <TriggerButton label="Add New Page" onClick={() => setOpen(true)} />
      <Dialog open={open} onOpenChange={changeOpen}>
        <DialogContent className="sm:max-w-2xl" data-new-dialog="page">
          <form onSubmit={submit} className="grid gap-5">
            <DialogHeader>
              <DialogTitle>Add New Page</DialogTitle>
              <DialogDescription>
                It’s created as a draft. You can change everything afterwards.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Title" htmlFor="new-page-title" error={form.errors.title}>
                <Input
                  id="new-page-title"
                  autoFocus
                  value={form.data.title}
                  placeholder={template?.title ?? 'About us'}
                  onChange={(event) => {
                    form.setData((data) => ({
                      ...data,
                      title: event.target.value,
                      slug: slugTouched ? data.slug : slugify(event.target.value),
                    }))
                  }}
                />
              </FormField>
              <FormField
                label="Slug"
                htmlFor="new-page-slug"
                error={form.errors.slug}
                help="The last part of its address."
              >
                <Input
                  id="new-page-slug"
                  className="font-mono"
                  value={form.data.slug}
                  placeholder={template?.slug ?? 'about-us'}
                  onChange={(event) => {
                    setSlugTouched(true)
                    form.setData('slug', event.target.value)
                  }}
                />
              </FormField>
            </div>
            <div className="grid gap-2">
              <span className="text-sm font-medium">Start from</span>
              <TemplateCards
                cards={cards}
                value={form.data.template}
                onChange={(key) => form.setData('template', key)}
              />
              <OtherErrors errors={form.errors} shown={['title', 'slug']} />
            </div>
            <DialogFooter className="items-center sm:justify-between">
              <Link
                href={urlFor('admin.pages.create')}
                className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
              >
                Open the full editor
              </Link>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => changeOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={form.processing}>
                  Create page
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function NewCollectionDialog({ templates }: { templates: CollectionTemplateOption[] }) {
  const [open, setOpen] = useState(false)
  const [slugTouched, setSlugTouched] = useState(false)
  const form = useForm({ name: '', slug: '', template: '' })
  useOpenFromQuery(setOpen)

  const template = templates.find((item) => item.key === form.data.template)
  const cards: Card[] = [
    {
      key: '',
      title: 'No template',
      description: 'An empty collection. Define its fields yourself.',
      icon: <Library className="size-4" />,
      meta: '',
    },
    ...templates.map((item) => ({
      key: item.key,
      title: item.name,
      description: item.description,
      icon: <Icon name={item.icon} className="size-4" />,
      meta: item.fields.join(' · '),
    })),
  ]

  const changeOpen = (next: boolean) => {
    setOpen(next)
    if (!next) {
      form.reset()
      form.clearErrors()
      setSlugTouched(false)
    }
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    form.post(urlFor('admin.collections.store'), { preserveScroll: true })
  }

  const errors = form.errors as Record<string, string>

  return (
    <>
      <TriggerButton label="Add New Collection" onClick={() => setOpen(true)} />
      <Dialog open={open} onOpenChange={changeOpen}>
        <DialogContent className="sm:max-w-2xl" data-new-dialog="collection">
          <form onSubmit={submit} className="grid gap-5">
            <DialogHeader>
              <DialogTitle>Add New Collection</DialogTitle>
              <DialogDescription>
                A template fills in the fields. You can change them afterwards.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Name" htmlFor="new-collection-name" error={errors.name}>
                <Input
                  id="new-collection-name"
                  autoFocus
                  value={form.data.name}
                  placeholder={template?.name ?? 'Blog Posts'}
                  onChange={(event) => {
                    form.setData((data) => ({
                      ...data,
                      name: event.target.value,
                      slug: slugTouched ? data.slug : slugify(event.target.value),
                    }))
                  }}
                />
              </FormField>
              <FormField
                label="Slug"
                htmlFor="new-collection-slug"
                error={errors.slug}
                help="Used in the API. It can’t change later."
              >
                <Input
                  id="new-collection-slug"
                  className="font-mono"
                  value={form.data.slug}
                  placeholder={template?.slug ?? 'posts'}
                  onChange={(event) => {
                    setSlugTouched(true)
                    form.setData('slug', event.target.value)
                  }}
                />
              </FormField>
            </div>
            <div className="grid gap-2">
              <span className="text-sm font-medium">Start from</span>
              <TemplateCards
                cards={cards}
                value={form.data.template}
                onChange={(key) => form.setData('template', key)}
              />
              <OtherErrors errors={errors} shown={['name', 'slug']} />
            </div>
            <DialogFooter className="items-center sm:justify-between">
              <Link
                href={urlFor('admin.collections.create')}
                className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
              >
                Open the full form
              </Link>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => changeOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={form.processing}>
                  Create collection
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
