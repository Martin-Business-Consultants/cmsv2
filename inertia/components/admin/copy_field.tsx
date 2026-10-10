import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { cn } from '~/lib/utils'

export default function CopyField({ value, className }: { value: string; className?: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className={cn('bg-background flex items-center gap-2 rounded-md border p-1 pl-3', className)}
    >
      <code className="min-w-0 flex-1 overflow-x-auto py-1 font-mono text-xs whitespace-nowrap">
        {value}
      </code>
      <Button type="button" variant="ghost" size="sm" onClick={copy}>
        {copied ? <Check /> : <Copy />}
        {copied ? 'Copied' : 'Copy'}
      </Button>
    </div>
  )
}
