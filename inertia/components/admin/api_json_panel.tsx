import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Card, CardContent } from '~/components/ui/card'
import { Skeleton } from '~/components/ui/skeleton'
import CopyField from '~/components/admin/copy_field'

export type ApiPreview = {
  path: string
  url: string
  cli: string
  live: boolean
  json: string
}

function CopyButton({ value, label = 'Copy' }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button type="button" variant="ghost" size="sm" onClick={copy}>
      {copied ? <Check /> : <Copy />}
      {copied ? 'Copied' : label}
    </Button>
  )
}

function Snippet({ code }: { code: string }) {
  return (
    <div className="bg-muted/50 flex items-start gap-2 rounded-md border p-1 pl-3">
      <pre className="min-w-0 flex-1 overflow-x-auto py-1.5 font-mono text-xs whitespace-pre">
        {code}
      </pre>
      <CopyButton value={code} />
    </div>
  )
}

export default function ApiJsonPanel({ preview, noun }: { preview?: ApiPreview; noun: string }) {
  if (!preview) {
    return (
      <Card>
        <CardContent className="grid gap-3" aria-busy="true">
          <p className="text-muted-foreground text-sm">Loading…</p>
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    )
  }

  const curl = `curl -H "Authorization: Bearer $CMS_API_TOKEN" "${preview.url}"`
  const fetchCall = `const response = await fetch(${JSON.stringify(preview.url)}, {\n  headers: { Authorization: \`Bearer \${process.env.CMS_API_TOKEN}\` },\n})\nconst { data } = await response.json()`

  return (
    <Card>
      <CardContent className="grid gap-6" data-api-preview>
        <p className="text-muted-foreground text-sm">
          This is exactly what the delivery API returns for this {noun}, as last saved. A separate
          frontend fetches this JSON and draws it with its own components; the built-in theme reads
          the same content.
        </p>
        {!preview.live && (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
            The delivery API serves live content only: this {noun} answers 404 there until it is
            published.
          </p>
        )}
        <div className="grid gap-1.5">
          <span className="text-sm font-medium">Endpoint</span>
          <CopyField value={`GET ${preview.url}`} />
        </div>
        <details open className="grid gap-2">
          <summary className="cursor-pointer text-sm font-medium">Fetch it</summary>
          <div className="mt-2 grid gap-2">
            <Snippet code={`${preview.cli}   # the cms CLI, or the same tool over MCP`} />
            <Snippet code={curl} />
            <Snippet code={fetchCall} />
          </div>
        </details>
        <div className="grid gap-1.5">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-medium">Response</span>
            <CopyButton value={preview.json} label="Copy JSON" />
          </div>
          <pre
            data-api-json
            className="bg-muted/50 max-h-[70vh] overflow-auto rounded-md border px-4 py-3 font-mono text-xs"
          >
            <code>{preview.json}</code>
          </pre>
        </div>
      </CardContent>
    </Card>
  )
}
