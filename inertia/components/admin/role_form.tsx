import type { FormEvent } from 'react'
import { useForm } from '@inertiajs/react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Textarea } from '~/components/ui/textarea'
import { Checkbox } from '~/components/ui/checkbox'
import { Label } from '~/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import FormField from '~/components/admin/form_field'
import { errorAt, type Errors } from '~/lib/errors'

export type CapabilityGroups = { group: string; capabilities: string[] }[]

export type RoleFormData = {
  name: string
  description: string
  permissions: string[]
}

const VERBS: Record<string, string> = {
  read: 'View',
  write: 'Create & edit',
  publish: 'Publish',
  delete: 'Delete',
}

function capabilityLabel(capability: string) {
  const [subject, verb] = capability.split(':')
  const base = VERBS[verb] ?? verb
  if (subject === 'submissions') return verb === 'read' ? 'View submissions' : 'Delete submissions'
  if (subject === 'trash' && verb === 'write') return 'Restore & delete forever'
  if (subject === 'settings' && verb === 'write') return 'Edit'
  return base
}

export default function RoleForm({
  initial,
  capabilities,
  action,
  method,
  submitLabel,
  readOnly,
}: {
  initial: RoleFormData
  capabilities: CapabilityGroups
  action: string
  method: 'post' | 'put'
  submitLabel: string
  readOnly?: boolean
}) {
  const form = useForm<RoleFormData>(initial)
  const errors = form.errors as Errors
  const selected = new Set(form.data.permissions)

  function toggle(capability: string, on: boolean) {
    const next = new Set(form.data.permissions)
    if (on) next.add(capability)
    else next.delete(capability)
    form.setData('permissions', [...next])
  }

  function toggleGroup(group: string[], on: boolean) {
    const next = new Set(form.data.permissions)
    for (const capability of group) {
      if (on) next.add(capability)
      else next.delete(capability)
    }
    form.setData('permissions', [...next])
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    form.submit(method, action, { preserveScroll: true })
  }

  return (
    <form onSubmit={submit} className="grid gap-6">
      <fieldset disabled={readOnly} className="contents">
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <FormField label="Name" htmlFor="name" error={errorAt(errors, 'name')} required>
              <Input
                id="name"
                value={form.data.name}
                onChange={(event) => form.setData('name', event.target.value)}
              />
            </FormField>
            <FormField
              label="Description"
              htmlFor="description"
              error={errorAt(errors, 'description')}
            >
              <Textarea
                id="description"
                rows={2}
                value={form.data.description}
                onChange={(event) => form.setData('description', event.target.value)}
              />
            </FormField>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Permissions</CardTitle>
            <CardDescription>
              {selected.size} of {capabilities.flatMap((group) => group.capabilities).length}{' '}
              capabilities granted.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {errorAt(errors, 'permissions') && (
              <p className="text-destructive mb-3 text-xs">{errorAt(errors, 'permissions')}</p>
            )}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {capabilities.map(({ group, capabilities: list }) => {
                const count = list.filter((capability) => selected.has(capability)).length
                const all = count === list.length
                const groupId = `group-${group.replace(/\W+/g, '-')}`
                return (
                  <div key={group} className="rounded-lg border p-3">
                    <div className="mb-2 flex items-center gap-2 border-b pb-2">
                      <Checkbox
                        id={groupId}
                        checked={all ? true : count > 0 ? 'indeterminate' : false}
                        onCheckedChange={() => toggleGroup(list, !all)}
                        disabled={readOnly}
                      />
                      <Label htmlFor={groupId} className="font-medium">
                        {group}
                      </Label>
                      <span className="text-muted-foreground ml-auto text-xs">
                        {count}/{list.length}
                      </span>
                    </div>
                    <div className="grid gap-2">
                      {list.map((capability) => (
                        <div key={capability} className="flex items-center gap-2">
                          <Checkbox
                            id={capability}
                            checked={selected.has(capability)}
                            onCheckedChange={(checked) => toggle(capability, checked === true)}
                            disabled={readOnly}
                          />
                          <Label htmlFor={capability} className="font-normal">
                            {capabilityLabel(capability)}
                          </Label>
                          <code className="text-muted-foreground ml-auto text-[10px]">
                            {capability}
                          </code>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </fieldset>
      {!readOnly && (
        <div className="flex justify-end">
          <Button type="submit" disabled={form.processing}>
            {form.processing ? 'Saving…' : submitLabel}
          </Button>
        </div>
      )}
    </form>
  )
}
