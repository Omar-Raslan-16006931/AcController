import { format } from "date-fns"
import { motion } from "framer-motion"

import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { DayBar } from "@/features/dashboard/use-dashboard-analytics"

function formatBarHours(hours: number): string {
  if (hours === 0) return "0h"
  const rounded = Math.round(hours * 2) / 2
  return Number.isInteger(rounded) ? `${rounded}h` : `${rounded}h`
}

interface WeekBarChartProps {
  bars: DayBar[]
  onSelectDay: (date: string) => void
}

/** 7-bar chart, height proportional to that day's on-hours, today's bar in
 * the accent color and every other bar neutral -- tapping any bar opens
 * that day's detail sheet. A dashed line marks the 7-day average so each
 * bar's height reads relative to a reference, not just to its neighbors. */
export function WeekBarChart({ bars, onSelectDay }: WeekBarChartProps) {
  const maxHours = Math.max(1, ...bars.map((b) => b.hours))
  const avgHours = bars.length > 0 ? bars.reduce((sum, b) => sum + b.hours, 0) / bars.length : 0
  const avgHeightPct = Math.min(100, (avgHours / maxHours) * 100)

  return (
    <Card className="gap-3 p-4">
      <p className="text-[15px] font-semibold">This week</p>

      <div className="relative h-36">
        {avgHours > 0 && (
          <div
            className="border-muted-foreground/35 pointer-events-none absolute inset-x-0 z-10 border-t border-dashed"
            style={{ bottom: `${avgHeightPct}%` }}
          >
            <span className="text-muted-foreground bg-card absolute -top-2 right-0 pl-1.5 text-[9px] font-semibold tracking-wide uppercase">
              avg {formatBarHours(avgHours)}
            </span>
          </div>
        )}

        <div className="flex h-full items-end justify-between gap-2">
          {bars.map((bar, i) => {
            const heightPct = Math.max((bar.hours / maxHours) * 100, bar.hours > 0 ? 4 : 2)
            return (
              <motion.button
                key={bar.date}
                type="button"
                onClick={() => onSelectDay(bar.date)}
                whileTap={{ scale: 0.92 }}
                transition={{ type: "spring", stiffness: 500, damping: 25 }}
                className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
                aria-label={`${format(new Date(`${bar.date}T00:00:00`), "EEEE")}, ${formatBarHours(bar.hours)}`}
              >
                <span
                  className={cn(
                    "text-[10px] font-semibold tabular-nums",
                    bar.isToday ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {formatBarHours(bar.hours)}
                </span>
                <motion.span
                  initial={{ height: 0 }}
                  animate={{ height: `${heightPct}%` }}
                  transition={{ type: "spring", stiffness: 130, damping: 20, delay: i * 0.04 }}
                  className={cn(
                    "w-full min-h-[3px] rounded-full",
                    bar.isToday ? "bg-primary" : "bg-secondary"
                  )}
                />
                <span
                  className={cn(
                    "text-[11px] font-medium",
                    bar.isToday ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {format(new Date(`${bar.date}T00:00:00`), "EEEEE")}
                </span>
              </motion.button>
            )
          })}
        </div>
      </div>
    </Card>
  )
}
