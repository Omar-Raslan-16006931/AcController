import * as React from "react"
import { Minus, Plus } from "lucide-react"

import { cn } from "@/lib/utils"

const MIN_TEMP = 20
const MAX_TEMP = 28
const START_ANGLE = -135
const END_ANGLE = 135
const SWEEP = END_ANGLE - START_ANGLE

const SIZE = 200
const CENTER = SIZE / 2
const RADIUS = 84
const STROKE = 12

function angleForValue(value: number) {
  const t = (value - MIN_TEMP) / (MAX_TEMP - MIN_TEMP)
  return START_ANGLE + t * SWEEP
}

function valueForAngle(angle: number) {
  const clamped = Math.max(START_ANGLE, Math.min(END_ANGLE, angle))
  const t = (clamped - START_ANGLE) / SWEEP
  return Math.round(MIN_TEMP + t * (MAX_TEMP - MIN_TEMP))
}

function polarToCartesian(angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180
  return { x: CENTER + RADIUS * Math.sin(rad), y: CENTER - RADIUS * Math.cos(rad) }
}

function describeArc(startAngle: number, endAngle: number) {
  if (Math.abs(endAngle - startAngle) < 0.01) return ""
  const start = polarToCartesian(startAngle)
  const end = polarToCartesian(endAngle)
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1
  return `M ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${end.x} ${end.y}`
}

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
      className="bg-secondary text-foreground active:bg-secondary/70 flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-150 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40"
    >
      {children}
    </button>
  )
}

/**
 * Drag (or tap) anywhere on the ring to preview a temperature, release to
 * commit it -- committing only on release keeps a drag from firing a flood
 * of IR commands. The +/- buttons commit a one-degree nudge immediately.
 * `touch-none` on the ring stops the page from scrolling while dragging.
 */
export function TemperatureDial({
  value,
  disabled,
  onChange,
}: {
  value: number
  disabled?: boolean
  onChange: (value: number) => void
}) {
  const svgRef = React.useRef<SVGSVGElement>(null)
  const [dragValue, setDragValue] = React.useState<number | null>(null)
  const [isDragging, setIsDragging] = React.useState(false)

  const displayValue = dragValue ?? value

  const valueFromPointer = React.useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current
    if (!svg) return null
    const rect = svg.getBoundingClientRect()
    const scale = SIZE / rect.width
    const dx = (clientX - rect.left) * scale - CENTER
    const dy = (clientY - rect.top) * scale - CENTER
    const angle = (Math.atan2(dx, -dy) * 180) / Math.PI
    return valueForAngle(angle)
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

  const trackPath = describeArc(START_ANGLE, END_ANGLE)
  const fillPath = describeArc(START_ANGLE, angleForValue(displayValue))
  const handlePos = polarToCartesian(angleForValue(displayValue))

  return (
    <div className="flex w-full items-center justify-between gap-2">
      <StepButton label="Decrease temperature" disabled={disabled || value <= MIN_TEMP} onClick={() => step(-1)}>
        <Minus className="size-5" strokeWidth={2.4} />
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
          "relative touch-none rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
          disabled && "opacity-45"
        )}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className={cn("size-48 sm:size-52", disabled ? "cursor-not-allowed" : "cursor-pointer")}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <path d={trackPath} fill="none" stroke="var(--color-secondary)" strokeWidth={STROKE} strokeLinecap="round" />
          {fillPath && (
            <path d={fillPath} fill="none" stroke="var(--color-primary)" strokeWidth={STROKE} strokeLinecap="round" />
          )}
          <circle
            cx={handlePos.x}
            cy={handlePos.y}
            r={STROKE / 2 + 5}
            fill="var(--color-card)"
            stroke="var(--color-primary)"
            strokeWidth={3}
          />
        </svg>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">Set to</p>
          <p className="font-heading text-[52px] leading-none font-bold tracking-tight tabular-nums">
            {displayValue}
            <span className="text-muted-foreground align-top text-2xl font-semibold">°</span>
          </p>
          <p className="text-muted-foreground mt-1 text-[11px] tabular-nums">
            {MIN_TEMP}° – {MAX_TEMP}°C
          </p>
        </div>
      </div>

      <StepButton label="Increase temperature" disabled={disabled || value >= MAX_TEMP} onClick={() => step(1)}>
        <Plus className="size-5" strokeWidth={2.4} />
      </StepButton>
    </div>
  )
}

export { MIN_TEMP, MAX_TEMP }
