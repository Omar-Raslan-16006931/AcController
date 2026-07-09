import * as React from "react"
import { format } from "date-fns"
import { Timer, TrendingUp, ChevronRight } from "lucide-react"
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
import { useAcUsageDetail } from "@/features/dashboard/use-ac-usage-detail"
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

        <div className="max-h-72 space-y-1.5 overflow-y-auto">
          {isLoading && (
            <p className="text-muted-foreground py-6 text-center text-xs">Loading…</p>
          )}
          {!isLoading && activeDay && activeDay.intervals.length === 0 && (
            <p className="text-muted-foreground py-6 text-center text-xs">
              The AC wasn't used this day.
            </p>
          )}
          {!isLoading &&
            activeDay?.intervals.map((interval, i) => {
              const ModeIcon = interval.mode ? modeConfig[interval.mode].icon : null
              const FanIcon = interval.fan ? fanConfig[interval.fan].icon : null
              return (
                <div
                  key={i}
                  className="bg-secondary/60 flex items-center justify-between gap-2 rounded-xl px-3 py-2"
                >
                  <p className="text-xs font-semibold">
                    {formatClock(interval.startMs)} – {interval.ongoing ? "now" : formatClock(interval.endMs)}
                  </p>
                  <div className="text-muted-foreground flex items-center gap-2 text-[11px]">
                    {interval.temperature != null && (
                      <span className="font-medium tabular-nums">{interval.temperature}°</span>
                    )}
                    {ModeIcon && <ModeIcon className="size-3.5" />}
                    {FanIcon && interval.fan && <FanIcon className={fanConfig[interval.fan].iconSize} />}
                  </div>
                </div>
              )
            })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
