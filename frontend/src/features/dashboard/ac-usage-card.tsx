import { Timer, TrendingUp } from "lucide-react"
import { motion } from "framer-motion"

import { Card } from "@/components/ui/card"
import { useAcUsage } from "@/features/dashboard/use-ac-usage"

function formatDuration(totalSeconds: number): string {
  const totalMinutes = Math.round(totalSeconds / 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes}m`
  if (minutes === 0) return `${hours}h`
  return `${hours}h ${minutes}m`
}

/**
 * Auto-calculated from command_history power transitions (see
 * use-ac-usage.ts) -- no manual tracking needed. Shown as two compact
 * inline stats matching the rest of the dashboard's dense rhythm.
 */
export function AcUsageCard() {
  const { data, isLoading } = useAcUsage()

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
    </Card>
  )
}
