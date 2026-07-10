import * as React from "react"
import { format } from "date-fns"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { AnimatePresence, motion, type PanInfo } from "framer-motion"

import { fanConfig } from "@/lib/ac-labels"
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { tempRampColor } from "@/lib/temp-ramp"
import { useAcUsageDetail, type AcUsageDayDetail, type AcUsageInterval } from "@/features/dashboard/use-ac-usage-detail"

function formatDuration(hours: number): string {
  const totalMinutes = Math.round(hours * 60)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function formatClock(ms: number): string {
  return format(new Date(ms), "h:mm a")
}

function dayStats(day: AcUsageDayDetail | undefined) {
  if (!day) return { hours: 0, avgTemp: null as number | null }
  const totalMs = day.intervals.reduce((sum, iv) => sum + (iv.endMs - iv.startMs), 0)
  const weighted = day.intervals.filter((iv) => iv.temperature != null)
  const weightMs = weighted.reduce((sum, iv) => sum + (iv.endMs - iv.startMs), 0)
  const avgTemp =
    weightMs > 0
      ? Math.round(weighted.reduce((sum, iv) => sum + iv.temperature! * (iv.endMs - iv.startMs), 0) / weightMs)
      : null
  return { hours: totalMs / 3_600_000, avgTemp }
}

const DIAL_SIZE = 168
const DIAL_RADIUS = 70
const DIAL_CENTER = DIAL_SIZE / 2
const DIAL_CIRCUMFERENCE = 2 * Math.PI * DIAL_RADIUS

/** Compact 24h radial dial: each session drawn as an arc at its true clock
 * position (midnight at top, clockwise). Built from a stack of circles,
 * each rotated to its session's start time and dashed to its duration --
 * the standard SVG "circle as an arc" trick, since <path> arc math for a
 * variable-length clock arc is much fussier to get right. */
function DayRadialDial({ day, totalHours }: { day: AcUsageDayDetail | undefined; totalHours: number }) {
  const dayStartMs = day ? new Date(`${day.date}T00:00:00`).getTime() : 0

  return (
    <div className="relative shrink-0" style={{ width: DIAL_SIZE, height: DIAL_SIZE }}>
      <svg width={DIAL_SIZE} height={DIAL_SIZE} viewBox={`0 0 ${DIAL_SIZE} ${DIAL_SIZE}`}>
        <circle
          cx={DIAL_CENTER}
          cy={DIAL_CENTER}
          r={DIAL_RADIUS}
          fill="none"
          stroke="var(--secondary)"
          strokeWidth={10}
        />
        <g transform={`rotate(-90 ${DIAL_CENTER} ${DIAL_CENTER})`}>
          {day?.intervals.map((interval, i) => {
            const startMinutes = (interval.startMs - dayStartMs) / 60_000
            const durationMinutes = (interval.endMs - interval.startMs) / 60_000
            const arcLength = Math.max((durationMinutes / 1440) * DIAL_CIRCUMFERENCE, 2)
            const rotationDeg = (startMinutes / 1440) * 360
            const color = interval.temperature != null ? tempRampColor(interval.temperature) : "var(--primary)"
            return (
              <motion.circle
                key={i}
                cx={DIAL_CENTER}
                cy={DIAL_CENTER}
                r={DIAL_RADIUS}
                fill="none"
                stroke={color}
                strokeWidth={10}
                strokeLinecap="round"
                strokeDasharray={`${arcLength} ${DIAL_CIRCUMFERENCE - arcLength}`}
                transform={`rotate(${rotationDeg} ${DIAL_CENTER} ${DIAL_CENTER})`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.95 }}
                transition={{ delay: 0.1 + i * 0.05 }}
              />
            )
          })}
        </g>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-[22px] leading-none font-bold tabular-nums">{formatDuration(totalHours)}</p>
      </div>
    </div>
  )
}

function IntervalRow({
  interval,
  index,
  isLast,
}: {
  interval: AcUsageInterval
  index: number
  isLast: boolean
}) {
  const hours = (interval.endMs - interval.startMs) / 3_600_000
  const fan = interval.fan ? fanConfig[interval.fan] : null
  const FanIcon = fan?.icon
  const chipColor = interval.temperature != null ? tempRampColor(interval.temperature) : undefined

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.05 + index * 0.05 }}
      className="relative flex gap-3 pb-5 pl-1 last:pb-0"
    >
      <div className="relative flex w-3 shrink-0 flex-col items-center">
        <span className="bg-primary z-10 mt-1 size-2.5 rounded-full" />
        {!isLast && <span className="bg-border absolute top-3 bottom-[-1.25rem] w-px" />}
      </div>

      <div className="flex min-w-0 flex-1 items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[13.5px] font-semibold">
            {formatClock(interval.startMs)} – {interval.ongoing ? "now" : formatClock(interval.endMs)}
          </p>
          <p className="text-muted-foreground mt-0.5 flex items-center gap-1 text-[12px]">
            {FanIcon && <FanIcon className="size-3" />}
            {fan ? `${fan.label} fan` : "Fan"} · {formatDuration(hours)}
          </p>
        </div>
        {interval.temperature != null && (
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-[12px] font-semibold text-white"
            style={{ backgroundColor: chipColor }}
          >
            {interval.temperature}°
          </span>
        )}
      </div>
    </motion.div>
  )
}

interface DayDetailSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialDate: string | null
}

const SWIPE_DISTANCE_THRESHOLD = 60
const SWIPE_VELOCITY_THRESHOLD = 400

// Slide direction variants for the day-swap transition: `dir` is +1 when
// moving to a later day (content travels right-to-left) and -1 when moving
// to an earlier day (content travels left-to-right) -- matches the finger's
// swipe direction so the motion feels directly manipulated rather than
// just a generic fade.
const dayVariants = {
  enter: (dir: number) => ({ x: dir === 0 ? 0 : dir > 0 ? 36 : -36, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -36 : 36, opacity: 0 }),
}

export function DayDetailSheet({ open, onOpenChange, initialDate }: DayDetailSheetProps) {
  const { data: days } = useAcUsageDetail(open)
  const [selectedDate, setSelectedDate] = React.useState<string | null>(initialDate)
  // Tracks swipe direction so the outgoing/incoming day content slides the
  // correct way -- 1 = moving to a later day, -1 = moving to an earlier day.
  const [direction, setDirection] = React.useState(0)

  React.useEffect(() => {
    if (open) {
      setSelectedDate(initialDate)
      setDirection(0)
    }
  }, [open, initialDate])

  const activeIndex = days?.findIndex((d) => d.date === selectedDate) ?? -1
  const activeDay = activeIndex >= 0 ? days?.[activeIndex] : days?.[days.length - 1]
  const stats = dayStats(activeDay)
  const isToday = activeDay?.date === days?.[days.length - 1]?.date

  const resolvedIndex = days && activeDay ? days.findIndex((d) => d.date === activeDay.date) : -1
  const hasPrev = !!days && resolvedIndex > 0
  const hasNext = !!days && resolvedIndex >= 0 && resolvedIndex < days.length - 1

  const goToOffset = (delta: number) => {
    if (!days || resolvedIndex < 0) return
    const nextIndex = resolvedIndex + delta
    if (nextIndex < 0 || nextIndex >= days.length) return
    setDirection(delta)
    setSelectedDate(days[nextIndex].date)
  }

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const { offset, velocity } = info
    const passedDistance = Math.abs(offset.x) > SWIPE_DISTANCE_THRESHOLD
    const passedVelocity = Math.abs(velocity.x) > SWIPE_VELOCITY_THRESHOLD
    if (!passedDistance && !passedVelocity) return

    // Swipe left (negative offset) = advance to the next (later) day;
    // swipe right (positive offset) = go back to the previous day --
    // matches the standard "swipe left for next" convention.
    if (offset.x < 0) goToOffset(1)
    else goToOffset(-1)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="dashboard-flat dark bg-card border-border max-h-[85vh] gap-0 overflow-y-auto rounded-t-[1.75rem] border-t p-0 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
      >
        <div className="flex justify-center pt-2.5 pb-1" aria-hidden>
          <div className="bg-muted-foreground/40 h-1 w-9 rounded-full" />
        </div>

        <div className="flex items-center justify-between px-3">
          <button
            type="button"
            aria-label="Previous day"
            disabled={!hasPrev}
            onClick={() => goToOffset(-1)}
            className="text-muted-foreground flex size-7 items-center justify-center rounded-full transition-opacity disabled:opacity-0"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Next day"
            disabled={!hasNext}
            onClick={() => goToOffset(1)}
            className="text-muted-foreground flex size-7 items-center justify-center rounded-full transition-opacity disabled:opacity-0"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        <div className="overflow-hidden">
          <AnimatePresence initial={false} mode="popLayout" custom={direction}>
            <motion.div
              key={activeDay?.date ?? "empty"}
              custom={direction}
              variants={dayVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "spring", stiffness: 280, damping: 30, mass: 0.85 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={handleDragEnd}
              className="touch-pan-y"
            >
              <div className="flex items-start justify-between gap-3 px-5 pt-2">
                <DayRadialDial day={activeDay} totalHours={stats.hours} />
                <div className="min-w-0 flex-1 pt-1 text-right">
                  <SheetTitle className="text-[17px]">
                    {isToday
                      ? "Today"
                      : activeDay
                        ? format(new Date(`${activeDay.date}T00:00:00`), "EEEE, MMM d")
                        : ""}
                  </SheetTitle>
                  <SheetDescription className="mt-0.5 text-[13px]">
                    {formatDuration(stats.hours)} cooling
                    {stats.avgTemp != null && ` · avg ${stats.avgTemp}°C`}
                  </SheetDescription>
                </div>
              </div>

              <div className="px-5 pt-4">
                {activeDay && activeDay.intervals.length === 0 && (
                  <p className="text-muted-foreground py-8 text-center text-[13px]">
                    The AC wasn't used this day.
                  </p>
                )}
                {activeDay?.intervals.map((interval, i) => (
                  <IntervalRow
                    key={i}
                    interval={interval}
                    index={i}
                    isLast={i === activeDay.intervals.length - 1}
                  />
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {days && days.length > 1 && (
          <div className="flex items-center justify-center gap-1.5 pt-1 pb-3" aria-hidden>
            {days.map((day) => (
              <span
                key={day.date}
                className={`h-1.5 rounded-full transition-all ${
                  day.date === activeDay?.date ? "bg-primary w-4" : "bg-secondary w-1.5"
                }`}
              />
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
