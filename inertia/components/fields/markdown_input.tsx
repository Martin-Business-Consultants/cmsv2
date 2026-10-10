import { useState } from 'react'
import { Textarea } from '~/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { postForm } from '~/lib/http'
import { urlFor } from '~/client'

export default function MarkdownInput({
  id,
  value,
  onChange,
}: {
  id: string
  value: string
  onChange: (value: string) => void
}) {
  const [mode, setMode] = useState<'write' | 'preview'>('write')
  const [preview, setPreview] = useState<{ source: string; html: string } | null>(null)
  const [failed, setFailed] = useState(false)
  const loading = mode === 'preview' && preview?.source !== value && !failed

  function show(next: 'write' | 'preview') {
    setMode(next)
    if (next !== 'preview' || preview?.source === value) return
    setFailed(false)
    const body = new FormData()
    body.set('text', value)
    postForm<{ html: string }>(urlFor('admin.markdown_previews.store'), body)
      .then((response) => setPreview({ source: value, html: response.html }))
      .catch(() => setFailed(true))
  }

  return (
    <div className="grid gap-2" data-markdown-input>
      <Tabs value={mode} onValueChange={(next) => show(next as 'write' | 'preview')}>
        <TabsList className="h-8">
          <TabsTrigger value="write" className="px-2.5 text-xs">
            Write
          </TabsTrigger>
          <TabsTrigger value="preview" className="px-2.5 text-xs">
            Preview
          </TabsTrigger>
        </TabsList>
      </Tabs>
      {mode === 'write' ? (
        <Textarea
          id={id}
          rows={10}
          className="font-mono text-sm leading-relaxed"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <div className="min-h-40 rounded-md border px-4 py-3 text-sm" data-markdown-preview>
          {failed ? (
            <p className="text-destructive">The preview couldn’t be loaded.</p>
          ) : loading ? (
            <p className="text-muted-foreground">Loading preview…</p>
          ) : preview?.html ? (
            <div
              className="[&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:pl-4 [&_blockquote]:italic [&_code]:bg-muted [&_code]:rounded [&_code]:px-1 [&_h1]:text-2xl [&_h1]:font-semibold [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:font-semibold [&_ol]:list-decimal [&_ol]:pl-5 [&_pre]:bg-muted [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:p-3 [&_ul]:list-disc [&_ul]:pl-5 space-y-3"
              dangerouslySetInnerHTML={{ __html: preview.html }}
            />
          ) : (
            <p className="text-muted-foreground">Nothing to preview.</p>
          )}
        </div>
      )}
    </div>
  )
}
