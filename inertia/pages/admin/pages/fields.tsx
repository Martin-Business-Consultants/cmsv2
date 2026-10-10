import type { FormEvent } from 'react'
import { Head, useForm, usePage } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { Pencil } from 'lucide-react'
import type { CollectionOption, Field } from '#types/content'
import type { InertiaProps } from '~/types'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import PageHeader from '~/components/admin/page_header'
import SchemaEditor from '~/components/fields/schema_editor'
import { FieldsProvider } from '~/components/fields/context'
import type { Errors } from '~/lib/errors'
import { urlFor } from '~/client'

type Props = InertiaProps<{
  page: { id: number; title: string; path: string; fields: Field[] }
  collections: CollectionOption[]
}>

export default function PageFields({ page, collections }: Props) {
  const form = useForm<{ fields: Field[] }>({ fields: page.fields })
  const { errors: shared } = usePage().props
  const errors = { ...(shared as Errors), ...(form.errors as Errors) }

  function submit(event: FormEvent) {
    event.preventDefault()
    form.put(urlFor('admin.page_fields.update', { id: page.id }), { preserveScroll: true })
  }

  return (
    <>
      <Head title={`Fields: ${page.title}`} />
      <PageHeader
        title={`Fields: ${page.title}`}
        description={<span className="font-mono">/{page.path}</span>}
        back={{ href: urlFor('admin.pages.index'), label: 'Pages' }}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link route="admin.pages.edit" routeParams={{ id: page.id }}>
              <Pencil />
              Edit the page
            </Link>
          </Button>
        }
      />
      <FieldsProvider collections={collections} errors={errors}>
        <form onSubmit={submit} noValidate className="grid max-w-3xl gap-4">
          <Card className="gap-4 py-5">
            <CardHeader className="px-5">
              <CardTitle>Page fields</CardTitle>
              <CardDescription>
                Extra fields only this page has, filled in above its blocks in the editor. The
                values are served to the API as the page’s frontmatter.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-5">
              {typeof errors.fields === 'string' && (
                <p className="text-destructive mb-3 text-xs">{errors.fields}</p>
              )}
              <SchemaEditor
                allowBlocks={false}
                value={form.data.fields}
                onChange={(fields) => form.setData('fields', fields)}
              />
            </CardContent>
          </Card>
          <div className="flex items-center justify-end gap-3">
            {form.isDirty && (
              <span className="text-muted-foreground text-xs">You have unsaved changes.</span>
            )}
            <Button type="submit" disabled={form.processing}>
              {form.processing ? 'Saving…' : 'Save fields'}
            </Button>
          </div>
        </form>
      </FieldsProvider>
    </>
  )
}
