import type { KeyboardEvent, PointerEvent } from 'react'

const STEP = 0.05

function clamp(value: number) {
  return Math.min(1, Math.max(0, Math.round(value * 1000) / 1000))
}

export default function FocalPointPicker({
  src,
  alt,
  x,
  y,
  disabled,
  onChange,
}: {
  src: string
  alt: string
  x: number
  y: number
  disabled?: boolean
  onChange: (point: { x: number; y: number }) => void
}) {
  function pick(event: PointerEvent<HTMLDivElement>) {
    if (disabled) return
    const box = event.currentTarget.getBoundingClientRect()
    onChange({
      x: clamp((event.clientX - box.left) / box.width),
      y: clamp((event.clientY - box.top) / box.height),
    })
  }

  function nudge(event: KeyboardEvent<HTMLDivElement>) {
    if (disabled) return
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-STEP, 0],
      ArrowRight: [STEP, 0],
      ArrowUp: [0, -STEP],
      ArrowDown: [0, STEP],
    }
    const move = moves[event.key]
    if (!move) return
    event.preventDefault()
    onChange({ x: clamp(x + move[0]), y: clamp(y + move[1]) })
  }

  return (
    <div className="grid gap-3">
      <div
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label="Focal point"
        aria-valuetext={`${Math.round(x * 100)}% across, ${Math.round(y * 100)}% down`}
        onPointerDown={pick}
        onKeyDown={nudge}
        className="focus-visible:ring-ring/50 relative mx-auto w-fit cursor-crosshair overflow-hidden rounded-lg outline-none focus-visible:ring-[3px]"
        data-testid="focal-point"
      >
        <img src={src} alt={alt} draggable={false} className="block max-h-72 w-auto select-none" />
        <span
          className="pointer-events-none absolute size-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.4),0_2px_6px_rgba(0,0,0,0.4)]"
          style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
        />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          ['Wide', 'aspect-[16/9]'],
          ['Square', 'aspect-square'],
          ['Tall', 'aspect-[3/4]'],
        ].map(([label, ratio]) => (
          <figure key={label} className="grid gap-1">
            <div className={`bg-muted overflow-hidden rounded-md ${ratio}`}>
              <img
                src={src}
                alt=""
                className="size-full object-cover"
                style={{ objectPosition: `${x * 100}% ${y * 100}%` }}
              />
            </div>
            <figcaption className="text-muted-foreground text-center text-[11px]">
              {label}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  )
}
