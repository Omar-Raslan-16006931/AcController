import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"

import { cn } from "@/lib/utils"

const MIN_TEMP = 20
const MAX_TEMP = 28
const START_ANGLE = -135
const END_ANGLE = 135
const SWEEP = END_ANGLE - START_ANGLE

const SIZE = 220
const CENTER = SIZE / 2
const RADIUS = 92
const STROKE = 10

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

/**
 * Drag (or tap) anywhere on the ring to preview a temperature in real time,
 * release to commit it. Committing only on release/keypress — not on every
 * pointermove — keeps this from firing a flood of requests mid-drag.
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

  const angleFromPointer = React.useCallback((clientX: number, clientY: number) => {
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
    const next = angleFromPointer(e.clientX, e.clientY)
    if (next !== null) setDragValue(next)
  }

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDragging || disabled) return
    const next = angleFromPointer(e.clientX, e.clientY)
    if (next !== null) setDragValue(next)
  }

  const commit = () => {
    if (dragValue !== null && dragValue !== value) onChange(dragValue)
    setDragValue(null)
    setIsDragging(false)
  }

  const handlePointerUp = () => {
    if (!isDragging) return
    commit()
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

  const trackPath = describeArc(START_ANGLE, END_ANGLE)
  const fillPath = describeArc(START_ANGLE, angleForValue(displayValue))
  const handlePos = polarToCartesian(angleForValue(displayValue))
  const settleTransition = isDragging
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 340, damping: 30 }

  return (
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
        "relative touch-none select-none rounded-full focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
        disabled && "pointer-events-none opacity-40"
      )}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="size-52 cursor-pointer sm:size-56"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <path d={trackPath} fill="none" stroke="var(--color-border)" strokeWidth={STROKE} strokeLinecap="round" />
        {fillPath && (
          <path d={fillPath} fill="none" stroke="var(--color-frost)" strokeWidth={STROKE} strokeLinecap="round" />
        )}
        <motion.circle
          cx={handlePos.x}
          cy={handlePos.y}
          r={STROKE / 2 + 4}
          fill="var(--color-background)"
          stroke="var(--color-frost)"
          strokeWidth={2.5}
          animate={{ cx: handlePos.x, cy: handlePos.y }}
          transition={settleTransition}
        />
      </svg>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={displayValue}
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="font-heading text-4xl font-bold tabular-nums sm:text-5xl"
          >
            {displayValue}
            <span className="text-muted-foreground align-top text-base font-medium">°</span>
          </motion.div>
        </AnimatePresence>
        <p className="text-muted-foreground mt-0.5 text-[10px]">{MIN_TEMP}°–{MAX_TEMP}°C</p>
      </div>
    </div>
  )
}

export { MIN_TEMP, MAX_TEMP }
