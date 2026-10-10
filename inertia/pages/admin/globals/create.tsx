import { useState, type FormEvent } from 'react'
import { Head, useForm } from '@inertiajs/react'
import type { InertiaProps } from '~/types'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Textarea } from '~/components/ui/textarea'
import { Card, CardContent, CardFooter } from '~/components/ui/card'
import PageHeader from '~/components/admin/page_header'
import FormField from '~/components/admin/form_field'
import Icon from '~/components/admin/dynamic_icon'
import { snakeify } from '~/lib/format'
import { urlFor } from '~/client'

export default function GlobalsCreate(_props: InertiaProps) {
  const form = useForm({ name: '', slug: '', description: '', icon: '' })
  const [slugTouched, setSlugTouched] = useState(false)

  function submit(event: FormEvent) {
    event.preventDefault()
    form.post(urlFor('admin.globals.store'))
  }

  return (
    <>
      <Head title="New global" />
      <PageHeader
        title="New global"
        back={{ href: urlFor('admin.globals.index'), label: 'Globals' }}
      />
      <form onSubmit={submit} noValidate className="max-w-xl">
        <Card>
          <CardContent className="grid gap-4">
            <FormField label="Name" htmlFor="name" error={form.errors.name} required>
              <Input
                id="name"
                placeholder="Footer"
                value={form.data.name}
                onChange={(event) => {
                  const name = event.target.value
                  form.setData((data) => ({
                    ...data,
                    name,
                    slug: slugTouched ? data.slug : snakeify(name),
                  }))
                }}
              />
            </FormField>
            <FormField
              label="Slug"
              htmlFor="slug"
              error={form.errors.slug}
              help="How templates and the API refer to this global."
              required
            >
              <Input
                id="slug"
                className="font-mono"
                value={form.data.slug}
                onChange={(event) => {
                  setSlugTouched(true)
                  form.setData('slug', event.target.value)
                }}
              />
            </FormField>
            <FormField label="Description" htmlFor="description" error={form.errors.description}>
              <Textarea
                id="description"
                rows={2}
                value={form.data.description}
                onChange={(event) => form.setData('description', event.target.value)}
              />
            </FormField>
            <FormField
              label="Icon"
              htmlFor="icon"
              error={form.errors.icon}
              help="A lucide icon name, like globe or menu."
            >
              <div className="flex items-center gap-2">
                <span className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-md border">
                  <Icon name={form.data.icon || 'globe'} className="size-4" />
                </span>
                <Input
                  id="icon"
                  autoComplete="off"
                  placeholder="globe"
                  value={form.data.icon}
                  onChange={(event) => form.setData('icon', event.target.value)}
                />
              </div>
            </FormField>
          </CardContent>
          <CardFooter className="justify-end">
            <Button type="submit" disabled={form.processing}>
              {form.processing ? 'Creating…' : 'Create global'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </>
  )
}
