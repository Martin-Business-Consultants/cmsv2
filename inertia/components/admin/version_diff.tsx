import type {
  BlockRow,
  ContentDiffResult,
  DiffEntry,
  DiffField,
  DiffLine,
} from '#services/content_diff'
import { Badge } from '~/components/ui/badge'
import { cn } from '~/lib/utils'

const LABELS: Record<string, string> = {
  title: 'Title',
  blocks: 'Blocks',
  seo: 'SEO',
  frontmatter: 'Fields',
  data: 'Fields',
  body: 'Body',
}

export function fieldLabel(key: string) {
  return LABELS[key] ?? key.replace(/_/g, ' ').replace(/^./, (char) => char.toUpperCase())
}

export function differsLabel(keys: string[]) {
  const labels = [...new Set(keys.map(fieldLabel))]
  if (labels.length <= 1) return labels.join('')
  return `${labels.slice(0, -1).join(', ')} and ${labels.at(-1)}`
}

function Value({ text, tone }: { text: string | null; tone?: 'add' | 'del' }) {
  if (text === null || text === '') {
    return <span className="text-muted-foreground text-xs italic">(empty)</span>
  }
  return (
    <pre
      className={cn(
        'm-0 rounded-md p-3 font-mono text-xs break-words whitespace-pre-wrap',
        tone === 'add' &&
          'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200',
        tone === 'del' && 'bg-red-50 text-red-900 dark:bg-red-950/40 dark:text-red-200',
        !tone && 'bg-muted'
      )}
    >
      {text}
    </pre>
  )
}

function BeforeAfter({ before, after }: { before: string | null; after: string | null }) {
  return (
    <div className="grid items-start gap-2 sm:grid-cols-2">
      <div className="grid gap-1">
        <span className="text-muted-foreground text-[11px] font-medium uppercase">Now</span>
        <Value text={before} tone="del" />
      </div>
      <div className="grid gap-1">
        <span className="text-muted-foreground text-[11px] font-medium uppercase">
          This version
        </span>
        <Value text={after} tone="add" />
      </div>
    </div>
  )
}

function Entries({ entries }: { entries: DiffEntry[] }) {
  if (!entries.length)
    return <span className="text-muted-foreground text-xs">No keys changed.</span>
  return (
    <div className="grid gap-3">
      {entries.map((entry) => (
        <div key={entry.key} className="grid gap-1.5">
          <span className="text-xs">
            <code className="font-mono">{entry.key}</code>{' '}
            <span className="text-muted-foreground">{entry.op}</span>
          </span>
          {entry.op === 'added' ? (
            <Value text={entry.after} tone="add" />
          ) : entry.op === 'removed' ? (
            <Value text={entry.before} tone="del" />
          ) : (
            <BeforeAfter before={entry.before} after={entry.after} />
          )}
        </div>
      ))}
    </div>
  )
}

function Lines({ lines }: { lines: DiffLine[] }) {
  return (
    <div className="overflow-hidden rounded-md border font-mono text-xs">
      {lines.map((line, index) =>
        line.op === 'skip' ? (
          <div key={index} className="bg-muted text-muted-foreground px-3 py-0.5">
            … {line.count} unchanged {line.count === 1 ? 'line' : 'lines'}
          </div>
        ) : (
          <div
            key={index}
            className={cn(
              'px-3 py-0.5 break-words whitespace-pre-wrap',
              line.op === 'add' &&
                'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200',
              line.op === 'del' && 'bg-red-50 text-red-900 dark:bg-red-950/40 dark:text-red-200'
            )}
          >
            <span className="mr-2 inline-block w-2 select-none opacity-60">
              {line.op === 'add' ? '+' : line.op === 'del' ? '−' : ' '}
            </span>
            {line.text}
          </div>
        )
      )}
    </div>
  )
}

const BLOCK_TONE: Record<string, string> = {
  added: 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/30',
  removed: 'border-red-200 bg-red-50/60 dark:border-red-900 dark:bg-red-950/30',
}

function Blocks({ blocks, labels }: { blocks: BlockRow[]; labels: Record<string, string> }) {
  const touched = blocks.filter((block) => block.op !== 'unchanged')
  return (
    <div className="grid gap-2">
      {!touched.length && <span className="text-muted-foreground text-xs">No blocks changed.</span>}
      {blocks.map((block, index) => {
        const name = (block.type && labels[block.type]) || block.type || 'block'
        if (block.op === 'unchanged') {
          return (
            <div key={index} className="text-muted-foreground text-xs">
              {block.index + 1}. {name}: unchanged
            </div>
          )
        }
        return (
          <div
            key={index}
            data-block-op={block.op}
            className={cn('grid gap-2 rounded-lg border p-3', BLOCK_TONE[block.op])}
          >
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium">
                {block.index + 1}. {name}
              </span>
              <Badge variant="outline">
                {block.op.replace(/_/g, ' ').replace(/^./, (char) => char.toUpperCase())}
              </Badge>
              {typeof block.fromIndex === 'number' && block.fromIndex !== block.index && (
                <span className="text-muted-foreground text-xs">
                  moved from position {block.fromIndex + 1}
                </span>
              )}
            </div>
            {block.fields.length > 0 && <Entries entries={block.fields} />}
          </div>
        )
      })}
    </div>
  )
}

function Field({ field, labels }: { field: DiffField; labels: Record<string, string> }) {
  return (
    <section className="grid gap-2 border-t pt-5" data-diff-field={field.key}>
      <h3 className="text-sm font-semibold">{fieldLabel(field.key)}</h3>
      {field.kind === 'text' && <BeforeAfter before={field.before} after={field.after} />}
      {field.kind === 'lines' && <Lines lines={field.lines} />}
      {field.kind === 'object' && <Entries entries={field.entries} />}
      {field.kind === 'blocks' && <Blocks blocks={field.blocks} labels={labels} />}
    </section>
  )
}

export default function VersionDiff({
  diff,
  blockLabels = {},
}: {
  diff: ContentDiffResult
  blockLabels?: Record<string, string>
}) {
  return (
    <div className="grid gap-5">
      {diff.fields.map((field) => (
        <Field key={field.key} field={field} labels={blockLabels} />
      ))}
    </div>
  )
}
