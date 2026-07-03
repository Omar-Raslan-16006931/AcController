import type { LucideIcon } from "lucide-react"
import { motion } from "framer-motion"

import { cn } from "@/lib/utils"

interface StatCardProps {
  icon: LucideIcon
  label: string
  value: string
  sub?: string
  accent?: "default" | "success" | "warning" | "destructive"
  progress?: number
  index?: number
}

const accentClasses: Record<NonNullable<StatCardProps["accent"]>, string> = {
  default: "bg-primary/12 text-primary",
  success: "bg-success/12 text-success",
  warning: "bg-warning/15 text-warning",
  destructive: "bg-destructive/12 text-destructive",
}

/**
 * Compact iOS widget-style tile: fixed internal rhythm (icon row, value,
 * detail) so every tile in the grid lines up regardless of content.
 */
export function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent = "default",
  progress,
  index = 0,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 420, damping: 30, delay: index * 0.03 }}
      whileTap={{ scale: 0.97 }}
      className={cn(
        "bg-card flex flex-col rounded-[1.25rem] p-3.5",
        "shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_24px_-12px_rgb(0_0_0/0.12)]",
        "dark:shadow-none dark:ring-1 dark:ring-white/[0.07]"
      )}
    >
      <div className="flex items-center gap-2">
        <span className={cn("flex size-7 items-center justify-center rounded-[9px]", accentClasses[accent])}>
          <Icon className="size-4" />
        </span>
        <p className="text-muted-foreground truncate text-xs font-medium">{label}</p>
      </div>

      <p className="mt-2 truncate text-[22px] font-bold leading-none tracking-tight tabular-nums">
        {value}
      </p>
      <p className="text-muted-foreground mt-1 h-4 truncate text-[11px] leading-4">{sub ?? ""}</p>

      {progress !== undefined && (
        <div className="bg-secondary mt-1.5 h-1 w-full overflow-hidden rounded-full">
          <motion.div
            className={cn(
              "h-full rounded-full",
              progress > 85 ? "bg-destructive" : progress > 65 ? "bg-warning" : "bg-success"
            )}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 24, delay: 0.15 }}
          />
        </div>
      )}
    </motion.div>
  )
}
