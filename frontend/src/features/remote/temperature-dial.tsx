import * as React from "react"
import { motion, useSpring, useTransform } from "framer-motion"
import { Minus, Plus } from "lucide-react"

import { cn } from "@/lib/utils"

const MIN_TEMP = 20
const MAX_TEMP = 28
const START_ANGLE = -135
const END_ANGLE = 135
const SWEEP = END_ANGLE - START_ANGLE

const SIZE = 240
const CENTER = SIZE / 2
const RADIUS = 92
const STROKE = 6
const TICK_INNER = RADIUS + 12
const TICK_OUTER_MINOR = RADIUS + 18
const TICK_OUTER_MAJOR = RADIUS + 24

export type DialTone = "cool" | "heat" | "dry"

const TONE_COLOR: Record<DialTone, string> = {
  cool: "var(--color-primary)",
  heat: "var(--color-heat)",
  dry: "var(--color-warning)",
}

function angleForValue(value: number) {
  const t = (value - MIN_TEMP) / (MAX_TEMP - MIN_TEMP)
  return START_ANGLE + t * SWEEP
}

function valueForAngle(angle: number) {
  const clamped = Math.max(START_ANGLE, Math.min(END_ANGLE, angle))
  const t = (clamped - START_ANGLE) / SWEEP
  return Math.round(MIN_TEMP + t * (MAX_TEMP - MIN_TEMP))
}

function polar(angleDeg: number, r: number) {
  const rad = (angleDeg * Math.PI) / 180
  return { x: CENTER + r * Math.sin(rad), y: CENTER - r * Math.cos(rad) }
}

function describeArc(startAngle: number, endAngle: number) {
  if (endAngle - startAngle < 0.5) return ""
  const start = polar(startAngle, RADIUS)
  const end = polar(endAngle, RADIUS)
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1
  return `M ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${end.x} ${end.y}`
}

const TICKS = Array.from({ length: MAX_TEMP - MIN_TEMP + 1 }, (_, i) => MIN_TEMP + i)

function StepButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="bg-secondary text-foreground hover:bg-raised active:bg-raised/70 flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-35"
    >
      {children}
    </button>
  )
}

/**
 * The instrument dial -- the Remote page's centrepiece.
 *
 * A thin arc over a ring of degree ticks, tinted by mode (frost for cool,
 * ember for heat). The arc, handle and numeral all ride one spring, so a
 * change sweeps and counts through the degrees instead of jumping. While
 * dragging they follow the finger 1:1; the value commits on release so a
 * drag never fires a flood of IR commands. `touch-none` keeps the page from
 * scrolling mid-drag.
 */
export function TemperatureDial({
  value,
  disabled,
  tone = "cool",
  onChange,
}: {
  value: number
  disabled?: boolean
  tone?: DialTone
  onChange: (value: number) => void
}) {
  const svgRef = React.useRef<SVGSVGElement>(null)
  const [dragValue, setDragValue] = React.useState<number | null>(null)
  const [isDragging, setIsDragging] = React.useState(false)

  const displayValue = dragValue ?? value

  const spring = useSpring(displayValue, { stiffness: 210, damping: 26, mass: 0.9 })
  React.useEffect(() => {
    if (isDragging) spring.jump(displayValue)
    else spring.set(displayValue)
  }, [displayValue, isDragging, spring])

  const arcD = useTransform(spring, (v) => describeArc(START_ANGLE, angleForValue(v)))
  const handleX = useTransform(spring, (v) => polar(angleForValue(v), RADIUS).x)
  const handleY = useTransform(spring, (v) => polar(angleForValue(v), RADIUS).y)
  const numeral = useTransform(spring, (v) => String(Math.round(v)))

  const valueFromPointer = React.useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current
    if (!svg) return null
    const rect = svg.getBoundingClientRect()
    const scale = SIZE / rect.width
    const dx = (clientX - rect.left) * scale - CENTER
    const dy = (clientY - rect.top) * scale - CENTER
    return valueForAngle((Math.atan2(dx, -dy) * 180) / Math.PI)
  }, [])

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (disabled) return
    e.currentTarget.setPointerCapture(e.pointerId)
    setIsDragging(true)
    const next = valueFromPointer(e.clientX, e.clientY)
    if (next !== null) setDragValue(next)
  }

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDragging || disabled) return
    const next = valueFromPointer(e.clientX, e.clientY)
    if (next !== null) setDragValue(next)
  }

  const handlePointerUp = () => {
    if (!isDragging) return
    if (dragValue !== null && dragValue !== value) onChange(dragValue)
    setDragValue(null)
    setIsDragging(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return
    if (e.key === "ArrowUp" || e.key === "ArrowRight") {
      e.preventDefault()
      onChange(Math.min(MAX_TEMP, value + 1))
    } else if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
      e.preventDefault()
      onChange(Math.max(MIN_TEMP, value - 1))
    }
  }

  const step = (delta: number) => {
    if (disabled) return
    onChange(Math.max(MIN_TEMP, Math.min(MAX_TEMP, value + delta)))
  }

  const toneColor = TONE_COLOR[tone]
  const colorTransition = { transition: "stroke 400ms ease, fill 400ms ease, color 400ms ease" }

  return (
    <div className="flex w-full items-center justify-between gap-1">
      <StepButton label="Decrease temperature" disabled={disabled || value <= MIN_TEMP} onClick={() => step(-1)}>
        <Minus className="size-5" strokeWidth={2} />
      </StepButton>

      <div
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label="Temperature"
        aria-valuemin={MIN_TEMP}
        aria-valuemax={MAX_TEMP}
        aria-valuenow={displayValue}
        aria-valuetext={`${displayValue} degrees Celsius`}
        aria-disabled={disabled}
        onKeyDown={handleKeyDown}
        className={cn(
          "relative touch-none rounded-full outline-none transition-opacity duration-300 focus-visible:ring-[3px] focus-visible:ring-ring/50",
          disabled && "opacity-40"
        )}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className={cn("size-[13.5rem] sm:size-60", disabled ? "cursor-not-allowed" : "cursor-grab active:cursor-grabbing")}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {/* Degree ticks: one per degree, longer at the ends and midpoint. */}
          {TICKS.map((t) => {
            const a = angleForValue(t)
            const major = t === MIN_TEMP || t === MAX_TEMP || t === 24
            const lit = t <= displayValue
            const p1 = polar(a, TICK_INNER)
            const p2 = polar(a, major ? TICK_OUTER_MAJOR : TICK_OUTER_MINOR)
            return (
              <line
                key={t}
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                strokeWidth={major ? 2 : 1.5}
                strokeLinecap="round"
                style={{ stroke: lit ? toneColor : "var(--color-raised)", ...colorTransition }}
              />
            )
          })}

          <path
            d={describeArc(START_ANGLE, END_ANGLE)}
            fill="none"
            stroke="var(--color-secondary)"
            strokeWidth={STROKE}
            strokeLinecap="round"
          />
          <motion.path
            d={arcD}
            fill="none"
            strokeWidth={STROKE}
            strokeLinecap="round"
            style={{ stroke: toneColor, ...colorTransition }}
          />
          <motion.circle
            cx={handleX}
            cy={handleY}
            r={9}
            strokeWidth={4}
            style={{ fill: toneColor, stroke: "var(--color-card)", ...colorTransition }}
          />
        </svg>

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          {/* The numeral alone is centred; the degree mark hangs off its
              right edge so it doesn't pull the number off-axis. */}
          <p className="font-heading tnum relative leading-none">
            <motion.span className="block text-[76px] font-medium tracking-[-0.02em] sm:text-[84px]">
              {numeral}
            </motion.span>
            <span
              aria-hidden
              className="absolute top-1.5 left-full ml-1 text-[24px] font-medium"
              style={{ color: toneColor, ...colorTransition }}
            >
              °
            </span>
          </p>
        </div>
      </div>

      <StepButton label="Increase temperature" disabled={disabled || value >= MAX_TEMP} onClick={() => step(1)}>
        <Plus className="size-5" strokeWidth={2} />
      </StepButton>
    </div>
  )
}

export { MIN_TEMP, MAX_TEMP }
