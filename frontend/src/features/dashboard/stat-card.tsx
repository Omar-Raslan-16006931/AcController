import type { LucideIcon } from "lucide-react"
import { motion } from "framer-motion"

import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"

interface StatCardProps {
  icon: LucideIcon
  label: string
  value: string
  sub?: string
  accent?: "default" | "success" | "warning" | "destructive"
  progress?: number
}

const accentClasses: Record<NonNullable<StatCardProps["accent"]>, string> = {
  default: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  destructive: "bg-destructive/10 text-destructive",
}

export function StatCard({ icon: Icon, label, value, sub, accent = "default", progress }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      whileHover={{ y: -2 }}
    >
      <Card>
        <CardContent className="flex items-start gap-3 pt-6">
          <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", accentClasses[accent])}>
            <Icon className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-muted-foreground text-xs font-medium">{label}</p>
            <p className="mt-0.5 truncate text-xl font-semibold tabular-nums">{value}</p>
            {sub && <p className="text-muted-foreground mt-0.5 truncate text-xs">{sub}</p>}
            {progress !== undefined && (
              <div className="bg-muted mt-2 h-1.5 w-full overflow-hidden rounded-full">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    progress > 85 ? "bg-destructive" : progress > 65 ? "bg-warning" : "bg-success"
                  )}
                  style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
