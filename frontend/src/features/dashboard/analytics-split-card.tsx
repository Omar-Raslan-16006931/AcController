import { Timer, TrendingUp } from "lucide-react"
import { motion } from "framer-motion"

import { Card } from "@/components/ui/card"

function formatHours(hours: number): string {
  const totalMinutes = Math.round(hours * 60)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

interface AnalyticsSplitCardProps {
  todayHours: number
  weekAverageHours: number
}

export function AnalyticsSplitCard({ todayHours, weekAverageHours }: AnalyticsSplitCardProps) {
  return (
    <Card className="flex-row gap-0 divide-x divide-border p-0">
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 460, damping: 32 }}
        className="flex flex-1 items-center gap-2.5 p-3.5"
      >
        <span className="bg-primary/15 text-primary flex size-8 shrink-0 items-center justify-center rounded-full">
          <Timer className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-muted-foreground truncate text-[11px] leading-tight font-medium">On today</p>
          <p className="text-[15px] leading-tight font-bold tabular-nums">{formatHours(todayHours)}</p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 460, damping: 32, delay: 0.04 }}
        className="flex flex-1 items-center gap-2.5 p-3.5"
      >
        <span className="bg-emerald-500/15 text-emerald-400 flex size-8 shrink-0 items-center justify-center rounded-full">
          <TrendingUp className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-muted-foreground truncate text-[11px] leading-tight font-medium">7-day average</p>
          <p className="text-[15px] leading-tight font-bold tabular-nums">{formatHours(weekAverageHours)}</p>
        </div>
      </motion.div>
    </Card>
  )
}
