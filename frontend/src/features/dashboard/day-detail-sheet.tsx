import * as React from "react"
import { format } from "date-fns"
import { ChevronLeft, ChevronRight, Wind } from "lucide-react"

import { cn } from "@/lib/utils"
import { fanConfig } from "@/lib/ac-labels"
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { tempRampColor } from "@/lib/temp-ramp"
import { useAcUsageDetail, type AcUsageDayDetail, type AcUsageInterval } from "@/features/dashboard/use-ac-usage-detail"

// Sessions shorter than this are almost always stray taps; they're hidden
// from the list only. Totals/averages still count every second of on-time.
const MIN_DISPLAYED_INTERVAL_MS = 5 * 60_000

/** "27 min", "1 h", "1 h 5 min" */
function formatMinutes(ms: number): string {
  const total = Math.max(1, Math.round(ms / 60_000))
  const h = Math.floor(total / 60)
  const m = total % 60
  if (h === 0) return `${m} min`
  if (m === 0) return `${h} h`
  return `${h} h ${m} min`
}

function formatClock(ms: number): string {
  return format(new Date(ms), "h:mm a")
}

function dayStats(day: AcUsageDayDetail | undefined) {
  if (!day) return { totalMs: 0, avgTemp: null as number | null }
  const totalMs = day.intervals.reduce((sum, iv) => sum + (iv.endMs - iv.startMs), 0)
  const weighted = day.intervals.filter((iv) => iv.temperature != null)
  const weightMs = weighted.reduce((sum, iv) => sum + (iv.endMs - iv.startMs), 0)
  const avgTemp =
    weightMs > 0
      ? Math.round(weighted.reduce((sum, iv) => sum + iv.temperature! * (iv.endMs - iv.startMs), 0) / weightMs)
      : null
  return { totalMs, avgTemp }
}

/** Flat 24-hour strip: each session drawn at its real time of day. */
function DayStrip({ day }: { day: AcUsageDayDetail | undefined }) {
  const dayStartMs = day ? new Date(`${day.date}T00:00:00`).getTime() : 0
  const DAY_MS = 86_400_000
  return (
    <div>
      <div className="bg-secondary relative h-3 w-full overflow-hidden rounded-full">
        {day?.intervals.map((iv, i) => {
          const left = ((iv.startMs - dayStartMs) / DAY_MS) * 100
          const width = Math.max(((iv.endMs - iv.startMs) / DAY_MS) * 100, 0.6)
          return (
            <span
              key={i}
              className="absolute inset-y-0 rounded-full"
              style={{
                left: `${left}%`,
                width: `${width}%`,
                backgroundColor: iv.temperature != null ? tempRampColor(iv.temperature) : "var(--primary)",
              }}
            />
          )
        })}
      </div>
      <div className="text-muted-foreground mt-1.5 flex justify-between text-[10px] tabular-nums">
        <span>12a</span>
        <span>6a</span>
        <span>12p</span>
        <span>6p</span>
        <span>12a</span>
      </div>
    </div>
  )
}

function IntervalRow({ interval }: { interval: AcUsageInterval }) {
  const ms = interval.endMs - interval.startMs
  const fan = interval.fan ? fanConfig[interval.fan] : null

  return (
    <div className="bg-secondary flex items-center gap-3 rounded-2xl px-3.5 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-semibold tabular-nums">
          {formatClock(interval.startMs)} – {interval.ongoing ? "now" : formatClock(interval.endMs)}
        </p>
        <p className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-[12px]">
          <Wind className="size-3" />
          {fan ? `${fan.label} fan` : "Fan"}
          {interval.temperature != null && (
            <>
              <span aria-hidden>·</span>
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: tempRampColor(interval.temperature) }}
                aria-hidden
              />
              {interval.temperature}°C
            </>
          )}
        </p>
      </div>
      <p className="text-primary shrink-0 text-[17px] font-bold tabular-nums">{formatMinutes(ms)}</p>
    </div>
  )
}

interface DayDetailSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialDate: string | null
}

export function DayDetailSheet({ open, onOpenChange, initialDate }: DayDetailSheetProps) {
  const { data: days } = useAcUsageDetail(open)
  const [selectedDate, setSelectedDate] = React.useState<string | null>(initialDate)
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const touchStart = React.useRef<{ x: number; y: number } | null>(null)

  React.useEffect(() => {
    if (open) setSelectedDate(initialDate)
  }, [open, initialDate])

  const activeIndex = days?.findIndex((d) => d.date === selectedDate) ?? -1
  const activeDay = activeIndex >= 0 ? days?.[activeIndex] : days?.[days.length - 1]
  const stats = dayStats(activeDay)
  const isToday = activeDay?.date === days?.[days.length - 1]?.date

  const displayIntervals = React.useMemo(
    () => activeDay?.intervals.filter((iv) => iv.endMs - iv.startMs >= MIN_DISPLAYED_INTERVAL_MS) ?? [],
    [activeDay]
  )
  const hiddenCount = (activeDay?.intervals.length ?? 0) - displayIntervals.length

  const resolvedIndex = days && activeDay ? days.findIndex((d) => d.date === activeDay.date) : -1
  const hasPrev = !!days && resolvedIndex > 0
  const hasNext = !!days && resolvedIndex >= 0 && resolvedIndex < days.length - 1

  const goToOffset = (delta: number) => {
    if (!days || resolvedIndex < 0) return
    const next = resolvedIndex + delta
    if (next < 0 || next >= days.length) return
    setSelectedDate(days[next].date)
    scrollRef.current?.scrollTo({ top: 0 })
  }

  // Horizontal swipe changes day. Plain touch listeners (no drag handler)
  // so vertical scrolling stays fully native.
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0]
    touchStart.current = { x: t.clientX, y: t.clientY }
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStart.current
    touchStart.current = null
    if (!start) return
    const t = e.changedTouches[0]
    const dx = t.clientX - start.x
    const dy = t.clientY - start.y
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) goToOffset(dx < 0 ? 1 : -1)
  }

  const title = isToday
    ? "Today"
    : activeDay
      ? format(new Date(`${activeDay.date}T00:00:00`), "EEEE, MMM d")
      : ""

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="dashboard-flat dark text-foreground bg-card border-border mx-auto flex h-[80svh] max-w-lg flex-col gap-0 rounded-t-[1.75rem] border-t p-0"
      >
        <div className="flex shrink-0 justify-center pt-2.5 pb-1" aria-hidden>
          <div className="bg-muted-foreground/40 h-1 w-9 rounded-full" />
        </div>

        {/* Header: day switcher */}
        <div className="flex shrink-0 items-center gap-2 px-3 pt-1 pr-12">
          <button
            type="button"
            aria-label="Previous day"
            disabled={!hasPrev}
            onClick={() => goToOffset(-1)}
            className="bg-secondary flex size-9 shrink-0 items-center justify-center rounded-full disabled:opacity-30"
          >
            <ChevronLeft className="size-4" />
          </button>
          <div className="min-w-0 flex-1 text-center">
            <SheetTitle className="truncate text-[17px] font-bold">{title}</SheetTitle>
            <SheetDescription className="sr-only">AC usage for this day</SheetDescription>
          </div>
          <button
            type="button"
            aria-label="Next day"
            disabled={!hasNext}
            onClick={() => goToOffset(1)}
            className="bg-secondary flex size-9 shrink-0 items-center justify-center rounded-full disabled:opacity-30"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        {/* Summary */}
        <div className="shrink-0 px-5 pt-4">
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Total on" value={stats.totalMs > 0 ? formatMinutes(stats.totalMs) : "0 min"} />
            <Stat label="Sessions" value={String(activeDay?.intervals.length ?? 0)} />
            <Stat label="Avg temp" value={stats.avgTemp != null ? `${stats.avgTemp}°C` : "–"} />
          </div>
          <div className="mt-4">
            <DayStrip day={activeDay} />
          </div>
        </div>

        {/* The only scrolling region */}
        <div
          ref={scrollRef}
          className="mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
          style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y" }}
        >
          {activeDay && activeDay.intervals.length === 0 && (
            <p className="text-muted-foreground py-8 text-center text-[13px]">The AC wasn't used this day.</p>
          )}
          <div className="space-y-2">
            {displayIntervals.map((interval, i) => (
              <IntervalRow key={i} interval={interval} />
            ))}
          </div>
          {hiddenCount > 0 && (
            <p className="text-muted-foreground pt-3 text-center text-[12px]">
              + {hiddenCount} short {hiddenCount === 1 ? "tap" : "taps"} under 5 min
            </p>
          )}
        </div>

        {days && days.length > 1 && (
          <div className="border-border flex shrink-0 items-center justify-center gap-1.5 border-t py-2.5" aria-hidden>
            {days.map((day) => (
              <span
                key={day.date}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  day.date === activeDay?.date ? "bg-primary w-4" : "bg-muted-foreground/30 w-1.5"
                )}
              />
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-secondary rounded-2xl px-3 py-2.5">
      <p className="text-muted-foreground text-[11px] font-medium">{label}</p>
      <p className="mt-0.5 text-[16px] font-bold tabular-nums">{value}</p>
    </div>
  )
}
