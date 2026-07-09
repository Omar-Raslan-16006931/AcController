import type { LucideIcon } from "lucide-react"
import { motion } from "framer-motion"

import { cn } from "@/lib/utils"

interface StatRowProps {
  icon: LucideIcon
  label: string
  value: string
  sub?: string
  accent?: "default" | "success" | "warning" | "destructive"
  progress?: number
  index?: number
}

const accentClasses: Record<NonNullable<StatRowProps["accent"]>, string> = {
  default: "bg-primary/12 text-primary",
  success: "bg-success/12 text-success",
  warning: "bg-warning/15 text-warning",
  destructive: "bg-destructive/12 text-destructive",
}

const barClasses: Record<NonNullable<StatRowProps["accent"]>, string> = {
  default: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
}

/**
 * Compact single-line metric row: icon chip, label, value, and (for
 * percent-based metrics) a short inline progress bar -- replaces the old
 * 104px StatCard tiles so 8 metrics fit in the space 3-4 used to take.
 */
export function StatRow({
  icon: Icon,
  label,
  value,
  sub,
  accent = "default",
  progress,
  index = 0,
}: StatRowProps) {
  const barColor = progress !== undefined && progress > 85 ? "destructive" : progress !== undefined && progress > 65 ? "warning" : accent

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 460, damping: 32, delay: index * 0.025 }}
      whileTap={{ scale: 0.98 }}
      className="flex items-center gap-2.5 py-2 first:pt-0 last:pb-0"
    >
      <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-[9px]", accentClasses[accent])}>
        <Icon className="size-3.5" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-muted-foreground truncate text-[11px] leading-tight font-medium">{label}</p>
        {progress !== undefined ? (
          <div className="bg-secondary mt-1 h-1 w-full max-w-24 overflow-hidden rounded-full">
            <motion.div
              className={cn("h-full rounded-full", barClasses[barColor as keyof typeof barClasses])}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              transition={{ type: "spring", stiffness: 140, damping: 26, delay: 0.1 }}
            />
          </div>
        ) : sub ? (
          <p className="text-muted-foreground/80 truncate text-[10.5px] leading-tight">{sub}</p>
        ) : null}
      </div>

      <p className="shrink-0 text-right text-[13px] leading-none font-bold tabular-nums">{value}</p>
    </motion.div>
  )
}
