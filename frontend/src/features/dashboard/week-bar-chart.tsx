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
 * that day's detail sheet. A dashed line marks the 7-day average.
 *
 * Structured as three stacked rows (hour labels / bar track / weekday
 * labels) instead of one column per bar -- the bar track is a `flex-1`
 * row with its own definite computed height, so both the bars' height%
 * and the average line's bottom% resolve against that SAME height. Doing
 * it as one flex column per bar (labels + bar together, justify-end)
 * made the bars' own visual "zero point" sit above the container's true
 * bottom (pushed up by the weekday label + gap below it), while the
 * average line was computed against the full container height -- so the
 * line always landed lower than the bars' actual scale implied. */
export function WeekBarChart({ bars, onSelectDay }: WeekBarChartProps) {
  const maxHours = Math.max(1, ...bars.map((b) => b.hours))
  const avgHours = bars.length > 0 ? bars.reduce((sum, b) => sum + b.hours, 0) / bars.length : 0
  const avgHeightPct = Math.min(100, (avgHours / maxHours) * 100)

  return (
    <Card className="gap-3 p-4">
      <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.08em] uppercase">Hours on · last 7 days</p>

      <div className="flex h-36 flex-col gap-1.5">
        <div className="flex justify-between gap-2">
          {bars.map((bar) => (
            <span
              key={bar.date}
              className={cn(
                "flex-1 text-center text-[11px] tabular-nums",
                bar.isToday ? "text-foreground font-medium" : "text-muted-foreground"
              )}
            >
              {formatBarHours(bar.hours)}
            </span>
          ))}
        </div>

        <div className="relative flex flex-1 items-end justify-between gap-2">
          {avgHours > 0 && (
            <div
              className="border-muted-foreground/30 pointer-events-none absolute inset-x-0 z-10 border-t border-dashed"
              style={{ bottom: `${avgHeightPct}%` }}
            >
              <span className="text-muted-foreground bg-card absolute -top-2.5 right-0 pl-2 text-[11px]">
                avg {formatBarHours(avgHours)}
              </span>
            </div>
          )}

          {bars.map((bar, i) => {
            const heightPct = Math.max((bar.hours / maxHours) * 100, bar.hours > 0 ? 4 : 2)
            return (
              <button
                key={bar.date}
                type="button"
                onClick={() => onSelectDay(bar.date)}
                className="group flex h-full flex-1 cursor-pointer items-end justify-center rounded-full"
                aria-label={`${format(new Date(`${bar.date}T00:00:00`), "EEEE")}, ${formatBarHours(bar.hours)}`}
              >
                {/* Height eases between values on data changes; initial={false}
                    so a bar is always drawn at its real height, never gated
                    on a mount animation. */}
                <motion.span
                  initial={false}
                  animate={{ height: `${heightPct}%` }}
                  transition={{ type: "spring", stiffness: 160, damping: 24, delay: i * 0.02 }}
                  className={cn(
                    "w-full min-h-[3px] rounded-full transition-colors duration-200",
                    bar.isToday ? "bg-primary" : "bg-secondary group-hover:bg-muted-foreground/40"
                  )}
                />
              </button>
            )
          })}
        </div>

        <div className="flex justify-between gap-2">
          {bars.map((bar) => (
            <span
              key={bar.date}
              className={cn(
                "flex-1 text-center text-[12px]",
                bar.isToday ? "text-primary font-medium" : "text-muted-foreground"
              )}
            >
              {format(new Date(`${bar.date}T00:00:00`), "EEEEE")}
            </span>
          ))}
        </div>
      </div>
    </Card>
  )
}
