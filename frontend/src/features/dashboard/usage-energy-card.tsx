import type { LucideIcon } from "lucide-react"
import { Zap, Wallet, Clock, Thermometer } from "lucide-react"
import { motion } from "framer-motion"

import { Card } from "@/components/ui/card"
import { formatEgp } from "@/lib/energy"

function UsageRow({
  icon: Icon,
  label,
  value,
  progress,
  index,
}: {
  icon: LucideIcon
  label: string
  value: string
  progress?: number
  index: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 460, damping: 32, delay: index * 0.03 }}
      className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
    >
      <span className="bg-primary/15 text-primary flex size-8 shrink-0 items-center justify-center rounded-full">
        <Icon className="size-4" />
      </span>
      <p className="text-muted-foreground min-w-0 flex-1 truncate text-[13px] font-medium">{label}</p>
      {progress !== undefined && (
        <div className="bg-secondary h-1.5 w-16 shrink-0 overflow-hidden rounded-full">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, progress)}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 24, delay: 0.15 }}
            className="bg-primary h-full rounded-full"
          />
        </div>
      )}
      <p className="shrink-0 text-[13px] font-bold tabular-nums">{value}</p>
    </motion.div>
  )
}

interface UsageEnergyCardProps {
  weekKwh: number
  weekCostEgp: number
  peakHourLabel: string
  weekAvgTemp: number | null
}

export function UsageEnergyCard({ weekKwh, weekCostEgp, peakHourLabel, weekAvgTemp }: UsageEnergyCardProps) {
  // Scaled against a rough "busy week" ceiling just to give the inline bar
  // something proportional to show -- not a hard usage cap.
  const kwhProgress = Math.min(100, (weekKwh / 80) * 100)

  return (
    <Card className="gap-1 p-4">
      <p className="text-muted-foreground mb-1 text-[11px] font-semibold tracking-[0.08em] uppercase">
        Usage · this week
      </p>

      <div className="divide-border divide-y">
        <UsageRow
          index={0}
          icon={Zap}
          label="Energy"
          value={`${weekKwh.toFixed(1)} kWh`}
          progress={kwhProgress}
        />
        <UsageRow index={1} icon={Wallet} label="Estimated cost" value={formatEgp(weekCostEgp)} />
        <UsageRow index={2} icon={Clock} label="Peak hours" value={peakHourLabel} />
        <UsageRow
          index={3}
          icon={Thermometer}
          label="Avg temperature"
          value={weekAvgTemp != null ? `${weekAvgTemp}°C` : "—"}
        />
      </div>
    </Card>
  )
}
