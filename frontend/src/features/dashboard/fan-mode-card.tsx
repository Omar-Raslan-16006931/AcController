import { motion } from "framer-motion"

import { Card } from "@/components/ui/card"
import { fanConfig } from "@/lib/ac-labels"
import { FAN_RAMP_COLOR } from "@/lib/temp-ramp"
import type { FanDistributionEntry } from "@/features/dashboard/use-dashboard-analytics"

interface FanModeCardProps {
  distribution: FanDistributionEntry[]
}

/** One stacked bar of the week's fan speeds, and the four shares under it on
 * one baseline. The bar widths ease to their values when data changes. */
export function FanModeCard({ distribution }: FanModeCardProps) {
  const hasAnyUsage = distribution.some((d) => d.percent > 0)

  return (
    <Card className="gap-4 px-5 py-4">
      <p className="text-muted-foreground text-[13px]">Fan speed this week</p>

      <div className="bg-secondary flex h-2 w-full gap-[3px] overflow-hidden rounded-full">
        {hasAnyUsage &&
          distribution
            .filter((d) => d.percent > 0)
            .map((d) => (
              <motion.div
                key={d.fan}
                initial={false}
                animate={{ width: `${d.percent}%` }}
                transition={{ type: "spring", stiffness: 140, damping: 26 }}
                className="h-full"
                style={{ backgroundColor: FAN_RAMP_COLOR[d.fan] }}
              />
            ))}
      </div>

      <div className="grid grid-cols-4 gap-2">
        {distribution.map((d) => (
          <div key={d.fan} className="min-w-0">
            <p className="text-muted-foreground flex items-center gap-1.5 truncate text-[12px]">
              <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: FAN_RAMP_COLOR[d.fan] }} aria-hidden />
              {fanConfig[d.fan].label}
            </p>
            <p className="font-heading tnum mt-1 text-[20px] leading-none font-medium">{d.percent}%</p>
          </div>
        ))}
      </div>
    </Card>
  )
}
