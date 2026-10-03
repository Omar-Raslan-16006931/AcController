import * as React from "react"
import { Minus, Plus } from "lucide-react"

import { cn } from "@/lib/utils"

export const MIN_TEMP = 20
export const MAX_TEMP = 28

const V = 236
const C = V / 2
const R = 92
const CIRC = 2 * Math.PI * R
const SWEEP = 0.75 * CIRC
const STEPS = MAX_TEMP - MIN_TEMP

function fraction(t: number) {
  return (t - MIN_TEMP) / STEPS
}

function knobPos(t: number) {
  const a = ((135 + 270 * fraction(t)) * Math.PI) / 180
  return { x: C + R * Math.cos(a), y: C + R * Math.sin(a) }
}

const TICKS = Array.from({ length: STEPS + 1 }, (_, k) => {
  const a = ((135 + (270 * k) / STEPS) * Math.PI) / 180
  const r1 = 108
  const r2 = k % 2 ? 111 : 115
  return {
    x1: C + r1 * Math.cos(a),
    y1: C + r1 * Math.sin(a),
    x2: C + r2 * Math.cos(a),
    y2: C + r2 * Math.sin(a),
    major: k % 2 === 0,
  }
})

/**
 * Glass temperature dial. Drag the ring to preview, release to commit (so a
 * drag never floods the AC with IR commands); − / + commit one degree.
 * `onPreview` reports the live value so the page can tint the background.
 */
export function GlassDial({
  value,
  off,
  disabled,
  status,
  onChange,
  onPreview,
}: {
  value: number
  off: boolean
  disabled?: boolean
  status: string
  onChange: (value: number) => void
  onPreview?: (value: number) => void
}) {
  const svgRef = React.useRef<SVGSVGElement>(null)
  const [drag, setDrag] = React.useState<number | null>(null)
  const shown = drag ?? value
  const locked = off || disabled

  React.useEffect(() => {
    onPreview?.(shown)
  }, [shown, onPreview])

  const fromPointer = (clientX: number, clientY: number) => {
    const svg = svgRef.current
    if (!svg) return null
    const r = svg.getBoundingClientRect()
    const x = ((clientX - r.left) / r.width) * V - C
    const y = ((clientY - r.top) / r.height) * V - C
    let rel = (((Math.atan2(y, x) * 180) / Math.PI - 135) % 360 + 720) % 360
    if (rel > 270) rel = rel > 315 ? 0 : 270
    return Math.round(MIN_TEMP + (rel / 270) * STEPS)
  }

  const onDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (locked) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const next = fromPointer(e.clientX, e.clientY)
    if (next !== null) setDrag(next)
  }
  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (drag === null || locked) return
    const next = fromPointer(e.clientX, e.clientY)
    if (next !== null) setDrag(next)
  }
  const onUp = () => {
    if (drag === null) return
    if (drag !== value) onChange(drag)
    setDrag(null)
  }

  const step = (delta: number) => {
    if (locked) return
    const next = Math.max(MIN_TEMP, Math.min(MAX_TEMP, value + delta))
    if (next !== value) onChange(next)
  }

  const knob = knobPos(shown)

  return (
    <div className="relative mx-auto flex w-full max-w-[320px] items-center justify-center">
      <div
        role="slider"
        tabIndex={locked ? -1 : 0}
        aria-label="Temperature"
        aria-valuemin={MIN_TEMP}
        aria-valuemax={MAX_TEMP}
        aria-valuenow={shown}
        aria-disabled={locked}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp" || e.key === "ArrowRight") step(1)
          if (e.key === "ArrowDown" || e.key === "ArrowLeft") step(-1)
        }}
        className="relative size-[200px] rounded-full outline-none select-none"
      >
        <div className="glass pointer-events-none absolute inset-[34px] flex flex-col items-center justify-center rounded-full">
          <div
            className={cn(
              "num pl-2 text-[50px] leading-none font-extralight tracking-[-2px] transition-opacity duration-300",
              off && "opacity-30"
            )}
          >
            {shown}
            <sup className="relative top-[6px] ml-0.5 align-top text-[18px] font-light tracking-normal">°</sup>
          </div>
          <div className={cn("mt-1 text-[11.5px] font-semibold", off ? "text-muted-foreground" : "text-ice")}>
            {status}
          </div>
        </div>

        <svg
          ref={svgRef}
          viewBox={`0 0 ${V} ${V}`}
          className={cn("absolute inset-0 size-full touch-none", locked ? "cursor-default" : "cursor-grab")}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        >
          <defs>
            <linearGradient id="dial-grad" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0" stopColor="#7fe0ff" />
              <stop offset="0.6" stopColor="#4b9dff" />
              <stop offset="1" stopColor="#ffb06a" />
            </linearGradient>
          </defs>
          <g className={cn("transition-opacity duration-300", off && "opacity-25")}>
            {TICKS.map((t, i) => (
              <line
                key={i}
                x1={t.x1}
                y1={t.y1}
                x2={t.x2}
                y2={t.y2}
                stroke={`rgba(255,255,255,${t.major ? 0.35 : 0.18})`}
                strokeWidth={1.5}
                strokeLinecap="round"
              />
            ))}
          </g>
          <circle
            cx={C}
            cy={C}
            r={R}
            fill="none"
            stroke="rgba(255,255,255,.1)"
            strokeWidth={14}
            strokeLinecap="round"
            strokeDasharray={`${SWEEP} ${CIRC}`}
            transform={`rotate(135 ${C} ${C})`}
          />
          <circle
            cx={C}
            cy={C}
            r={R}
            fill="none"
            stroke="url(#dial-grad)"
            strokeWidth={14}
            strokeLinecap="round"
            strokeDasharray={`${Math.max(0.01, SWEEP * fraction(shown))} ${CIRC}`}
            transform={`rotate(135 ${C} ${C})`}
            style={{
              transition: drag === null ? "stroke-dasharray .3s cubic-bezier(.3,.8,.3,1), opacity .3s" : "opacity .3s",
              opacity: off ? 0.25 : 1,
            }}
          />
          <circle cx={knob.x} cy={knob.y} r={11} fill="#fff" style={{ filter: "drop-shadow(0 2px 3px rgba(0,0,0,.4))" }} />
        </svg>
      </div>

      <button
        type="button"
        aria-label="Cooler"
        disabled={locked || value <= MIN_TEMP}
        onClick={() => step(-1)}
        className="glass absolute bottom-1 left-[calc(50%-138px)] flex size-[40px] cursor-pointer items-center justify-center rounded-full transition-opacity disabled:opacity-40"
      >
        <Minus className="size-[18px]" strokeWidth={1.6} />
      </button>
      <button
        type="button"
        aria-label="Warmer"
        disabled={locked || value >= MAX_TEMP}
        onClick={() => step(1)}
        className="glass absolute right-[calc(50%-138px)] bottom-1 flex size-[40px] cursor-pointer items-center justify-center rounded-full transition-opacity disabled:opacity-40"
      >
        <Plus className="size-[18px]" strokeWidth={1.6} />
      </button>
    </div>
  )
}
