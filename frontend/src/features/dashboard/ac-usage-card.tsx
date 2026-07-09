import * as React from "react"
import { format } from "date-fns"
import { Timer, TrendingUp, ChevronRight, Layers, Thermometer } from "lucide-react"
import { motion } from "framer-motion"

import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { useAcUsage } from "@/features/dashboard/use-ac-usage"
import { useAcUsageDetail, type AcUsageDayDetail, type AcUsageInterval } from "@/features/dashboard/use-ac-usage-detail"
import { modeConfig, fanConfig } from "@/lib/ac-labels"

function formatDuration(totalSeconds: number): string {
  const totalMinutes = Math.round(totalSeconds / 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes}m`
  if (minutes === 0) return `${hours}h`
  return `${hours}h ${minutes}m`
}

function formatClock(ms: number): string {
  return format(new Date(ms), "h:mm a")
}

/**
 * Auto-calculated from command_history power transitions (see
 * use-ac-usage.ts) -- no manual tracking needed. Shown as two compact
 * inline stats matching the rest of the dashboard's dense rhythm, with a
 * "Details" row underneath that opens a per-day breakdown of exactly when
 * the AC was on and what it was set to.
 */
export function AcUsageCard() {
  const { data, isLoading } = useAcUsage()
  const [detailOpen, setDetailOpen] = React.useState(false)

  if (isLoading || !data) {
    return (
      <Card className="flex items-center gap-2.5 p-3.5">
        <div className="bg-secondary size-7 animate-pulse rounded-[9px]" />
        <div className="bg-secondary h-4 w-32 animate-pulse rounded" />
      </Card>
    )
  }

  return (
    <Card className="p-3.5">
      <div className="flex items-center gap-4">
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 460, damping: 32 }}
          className="flex flex-1 items-center gap-2.5"
        >
          <span className="bg-primary/12 text-primary flex size-7 shrink-0 items-center justify-center rounded-[9px]">
            <Timer className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="text-muted-foreground truncate text-[11px] leading-tight font-medium">
              On today
            </p>
            <p className="text-[13px] leading-tight font-bold tabular-nums">
              {formatDuration(data.todaySeconds)}
            </p>
          </div>
        </motion.div>

        <div className="bg-border h-8 w-px" aria-hidden />

        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 460, damping: 32, delay: 0.03 }}
          className="flex flex-1 items-center gap-2.5"
        >
          <span className="bg-success/12 text-success flex size-7 shrink-0 items-center justify-center rounded-[9px]">
            <TrendingUp className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="text-muted-foreground truncate text-[11px] leading-tight font-medium">
              7-day average
            </p>
            <p className="text-[13px] leading-tight font-bold tabular-nums">
              {formatDuration(data.weekAverageSeconds)}
            </p>
          </div>
        </motion.div>
      </div>

      <button
        type="button"
        onClick={() => setDetailOpen(true)}
        className="text-muted-foreground hover:text-foreground border-border/60 mt-2.5 flex w-full items-center justify-center gap-1 border-t pt-2.5 text-[11px] font-medium transition-colors"
      >
        Details
        <ChevronRight className="size-3" />
      </button>

      <AcUsageDetailDialog open={detailOpen} onOpenChange={setDetailOpen} />
    </Card>
  )
}

function dayStatsFor(day: AcUsageDayDetail | undefined) {
  if (!day) return { totalSeconds: 0, sessions: 0, avgTemp: null as number | null }
  const totalSeconds = day.intervals.reduce((sum, iv) => sum + (iv.endMs - iv.startMs) / 1000, 0)
  const sessions = day.intervals.length
  const weighted = day.intervals.filter((iv) => iv.temperature != null)
  const weightMs = weighted.reduce((sum, iv) => sum + (iv.endMs - iv.startMs), 0)
  const avgTemp =
    weightMs > 0
      ? Math.round(
          weighted.reduce((sum, iv) => sum + iv.temperature! * (iv.endMs - iv.startMs), 0) / weightMs
        )
      : null
  return { totalSeconds, sessions, avgTemp }
}

const HOUR_MARKS = [
  { hour: 0, label: "12a" },
  { hour: 6, label: "6a" },
  { hour: 12, label: "12p" },
  { hour: 18, label: "6p" },
]

/** Horizontal 24h strip -- shaded segments show exactly when the AC was
 * running that day, colored to match the mode active during each segment,
 * so a busy day reads at a glance instead of requiring a scroll through
 * a list of times. */
function DayTimeline({ day }: { day: AcUsageDayDetail }) {
  const dayStartMs = new Date(`${day.date}T00:00:00`).getTime()
  const dayLengthMs = 24 * 60 * 60 * 1000

  return (
    <div>
      <div className="bg-secondary/70 relative h-5 w-full overflow-hidden rounded-full">
        {day.intervals.map((iv, i) => {
          const leftPct = Math.max(0, ((iv.startMs - dayStartMs) / dayLengthMs) * 100)
          const widthPct = Math.max(((iv.endMs - iv.startMs) / dayLengthMs) * 100, 0.8)
          const modeClassName = iv.mode ? modeConfig[iv.mode].className : "text-frost"
          return (
            <div
              key={i}
              className={cn(
                "absolute inset-y-0 rounded-full opacity-90",
                modeClassName.replace("text-", "bg-")
              )}
              style={{ left: `${leftPct}%`, width: `${Math.min(widthPct, 100 - leftPct)}%` }}
            />
          )
        })}
      </div>
      <div className="text-muted-foreground/70 mt-1 flex justify-between text-[9px] font-medium">
        {HOUR_MARKS.map((mark) => (
          <span key={mark.hour}>{mark.label}</span>
        ))}
        <span>12a</span>
      </div>
    </div>
  )
}

function DayStatChip({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Timer
  label: string
  value: string
}) {
  return (
    <div className="flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5">
      <div className="text-muted-foreground flex items-center gap-1">
        <Icon className="size-3" />
        <span className="text-[10px] font-medium">{label}</span>
      </div>
      <p className="text-[13px] font-bold tabular-nums">{value}</p>
    </div>
  )
}

function IntervalRow({ interval }: { interval: AcUsageInterval }) {
  const durationSeconds = (interval.endMs - interval.startMs) / 1000
  const mode = interval.mode ? modeConfig[interval.mode] : null
  const fan = interval.fan ? fanConfig[interval.fan] : null
  const ModeIcon = mode?.icon

  return (
    <div className="border-border/50 bg-card/60 flex items-center gap-3 rounded-xl border px-3 py-2.5">
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full",
          mode ? mode.className.replace("text-", "bg-") + "/15" : "bg-frost/15",
          mode?.className ?? "text-frost"
        )}
      >
        {ModeIcon ? <ModeIcon className="size-4" /> : <Thermometer className="size-4" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] leading-tight font-semibold">
          {formatClock(interval.startMs)} – {interval.ongoing ? "now" : formatClock(interval.endMs)}
        </p>
        <p className="text-muted-foreground mt-0.5 flex items-center gap-1 text-[11px] leading-tight">
          <span>{formatDuration(durationSeconds)}</span>
          {interval.temperature != null && (
            <>
              <span aria-hidden>·</span>
              <span className="tabular-nums">{interval.temperature}°</span>
            </>
          )}
          {mode && (
            <>
              <span aria-hidden>·</span>
              <span>{mode.label}</span>
            </>
          )}
          {fan && (
            <>
              <span aria-hidden>·</span>
              <span>{fan.label} fan</span>
            </>
          )}
        </p>
      </div>
      {interval.ongoing && (
        <span className="bg-success/15 text-success shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold">
          Live
        </span>
      )}
    </div>
  )
}

function AcUsageDetailDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { data: days, isLoading } = useAcUsageDetail(open)
  const [selectedDate, setSelectedDate] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (days && days.length > 0 && selectedDate === null) {
      setSelectedDate(days[days.length - 1]!.date)
    }
  }, [days, selectedDate])

  const activeDay = days?.find((d) => d.date === selectedDate) ?? days?.[days.length - 1]
  const stats = dayStatsFor(activeDay)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm gap-3">
        <DialogHeader>
          <DialogTitle>Usage details</DialogTitle>
          <DialogDescription>Tap a day to see exactly when the AC ran.</DialogDescription>
        </DialogHeader>

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {days?.map((day) => {
            const isSelected = activeDay?.date === day.date
            const totalSeconds = day.intervals.reduce(
              (sum, iv) => sum + (iv.endMs - iv.startMs) / 1000,
              0
            )
            return (
              <button
                key={day.date}
                type="button"
                onClick={() => setSelectedDate(day.date)}
                className={cn(
                  "flex shrink-0 flex-col items-center gap-0.5 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold transition-colors",
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                )}
              >
                {format(new Date(`${day.date}T00:00:00`), "EEE d")}
                <span className="text-[10px] font-normal opacity-80">
                  {totalSeconds > 0 ? formatDuration(totalSeconds) : "—"}
                </span>
              </button>
            )
          })}
        </div>

        {!isLoading && activeDay && (
          <>
            <DayTimeline day={activeDay} />

            <div className="bg-secondary/40 flex items-stretch divide-x divide-border/60 rounded-xl">
              <DayStatChip icon={Timer} label="Total on" value={formatDuration(stats.totalSeconds)} />
              <DayStatChip icon={Layers} label="Sessions" value={String(stats.sessions)} />
              <DayStatChip
                icon={Thermometer}
                label="Avg temp"
                value={stats.avgTemp != null ? `${stats.avgTemp}°` : "—"}
              />
            </div>
          </>
        )}

        <div className="max-h-64 space-y-1.5 overflow-y-auto">
          {isLoading && (
            <p className="text-muted-foreground py-6 text-center text-xs">Loading…</p>
          )}
          {!isLoading && activeDay && activeDay.intervals.length === 0 && (
            <p className="text-muted-foreground py-6 text-center text-xs">
              The AC wasn't used this day.
            </p>
          )}
          {!isLoading &&
            activeDay?.intervals.map((interval, i) => <IntervalRow key={i} interval={interval} />)}
        </div>
      </DialogContent>
    </Dialog>
  )
}
