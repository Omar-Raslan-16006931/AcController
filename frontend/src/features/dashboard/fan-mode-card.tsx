import { motion } from "framer-motion"

import { Card } from "@/components/ui/card"
import { fanConfig } from "@/lib/ac-labels"
import { FAN_RAMP_COLOR } from "@/lib/temp-ramp"
import type { FanDistributionEntry } from "@/features/dashboard/use-dashboard-analytics"

interface FanModeCardProps {
  distribution: FanDistributionEntry[]
}

/** Segmented horizontal bar (one segment per fan speed, width = share of
 * the week's on-time) + a legend row of percentages underneath, all four
 * segments/legend dots colored from the same cooler-to-warmer blue ramp
 * used for temperature elsewhere on this screen. */
export function FanModeCard({ distribution }: FanModeCardProps) {
  const hasAnyUsage = distribution.some((d) => d.percent > 0)

  return (
    <Card className="gap-3 p-4">
      <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.08em] uppercase">
        Fan mode · this week
      </p>

      <div className="bg-secondary flex h-2.5 w-full overflow-hidden rounded-full">
        {hasAnyUsage ? (
          distribution
            .filter((d) => d.percent > 0)
            .map((d, i) => (
              <motion.div
                key={d.fan}
                initial={{ width: 0 }}
                animate={{ width: `${d.percent}%` }}
                transition={{ type: "spring", stiffness: 120, damping: 24, delay: i * 0.05 }}
                style={{ backgroundColor: FAN_RAMP_COLOR[d.fan] }}
              />
            ))
        ) : (
          <div className="bg-secondary h-full w-full" />
        )}
      </div>

      <div className="grid grid-cols-4 gap-2">
        {distribution.map((d) => (
          <div key={d.fan} className="min-w-0">
            <p className="flex items-center gap-1.5 truncate text-[11px] font-medium">
              <span
                className="size-2 shrink-0 rounded-[2px]"
                style={{ backgroundColor: FAN_RAMP_COLOR[d.fan] }}
                aria-hidden
              />
              {fanConfig[d.fan].label}
            </p>
            <p className="mt-0.5 text-[15px] font-bold tabular-nums">{d.percent}%</p>
          </div>
        ))}
      </div>
    </Card>
  )
}
