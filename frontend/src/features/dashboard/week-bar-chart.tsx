import { format } from "date-fns"
import { motion } from "framer-motion"
import { ChevronRight } from "lucide-react"

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
 * that day's detail sheet. */
export function WeekBarChart({ bars, onSelectDay }: WeekBarChartProps) {
  const maxHours = Math.max(1, ...bars.map((b) => b.hours))

  return (
    <Card className="gap-3 p-4">
      <div className="flex items-center justify-between">
        <p className="text-[15px] font-semibold">This week</p>
        <span className="text-primary flex items-center gap-0.5 text-[12px] font-medium">
          tap a day
          <ChevronRight className="size-3" />
        </span>
      </div>

      <div className="flex h-36 items-end justify-between gap-2">
        {bars.map((bar, i) => {
          const heightPct = Math.max((bar.hours / maxHours) * 100, bar.hours > 0 ? 4 : 2)
          return (
            <button
              key={bar.date}
              type="button"
              onClick={() => onSelectDay(bar.date)}
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
                transition={{ type: "spring", stiffness: 140, damping: 22, delay: i * 0.03 }}
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
            </button>
          )
        })}
      </div>
    </Card>
  )
}
