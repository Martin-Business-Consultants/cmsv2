import { useState, type ReactNode } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import { availableChords, useKeyboard, useMenuHrefs } from '~/hooks/use_keyboard'

const MOD =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl'

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="bg-muted text-foreground inline-flex h-5 min-w-5 items-center justify-center rounded border px-1 font-mono text-[0.7rem] font-medium">
      {children}
    </kbd>
  )
}

function Keys({ keys }: { keys: string[][] }) {
  return (
    <span className="flex shrink-0 flex-wrap items-center justify-end gap-1">
      {keys.map((combo, index) => (
        <span key={combo.join('-')} className="flex items-center gap-1">
          {index > 0 && <span className="text-muted-foreground text-xs">or</span>}
          {combo.map((key, position) => (
            <Kbd key={position}>{key}</Kbd>
          ))}
        </span>
      ))}
    </span>
  )
}

function Group({ title, rows }: { title: string; rows: [string, string[][]][] }) {
  return (
    <section>
      <h3 className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
        {title}
      </h3>
      <dl className="grid gap-1.5">
        {rows.map(([label, keys]) => (
          <div key={label} className="flex items-center justify-between gap-4 text-sm">
            <dt>{label}</dt>
            <dd>
              <Keys keys={keys} />
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

export default function KeyboardShortcuts() {
  const [open, setOpen] = useState(false)
  useKeyboard({ onHelp: () => setOpen(true) })
  const chords = availableChords(useMenuHrefs())
  const seen = new Set<string>()
  const goRows: [string, string[][]][] = []
  for (const chord of chords) {
    if (seen.has(chord.href)) {
      const row = goRows.find(([label]) => label === chord.label)
      row?.[1].push(['g', chord.key])
      continue
    }
    seen.add(chord.href)
    goRows.push([chord.label, [['g', chord.key]]])
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>
            Letters work anywhere outside a text field. Press <Kbd>?</Kbd> to see this again.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="grid content-start gap-6">
            <Group
              title="Lists"
              rows={[
                ['Next / previous row', [['j'], ['k']]],
                ['First / last row', [['g', 'g'], ['G']]],
                ['Open the row', [['Enter'], ['o']]],
                ['Select the row', [['x']]],
                ['Edit / view the row', [['e'], ['v']]],
                ['Trash or delete the row', [['d']]],
                ['Search the list', [['/']]],
                ['Add new', [['n']]],
              ]}
            />
            <Group
              title="Anywhere"
              rows={[
                ['Save the form', [[MOD, 'Enter']]],
                ['Go up a level', [['Esc']]],
                ['Show shortcuts', [['?']]],
              ]}
            />
          </div>
          <Group title="Go to" rows={goRows} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
