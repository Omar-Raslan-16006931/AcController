import { formatDistanceToNow } from "date-fns"
import { motion } from "framer-motion"
import { Power, Wind, CheckCircle2, XCircle } from "lucide-react"

import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { modeConfig, fanConfig } from "@/lib/ac-labels"
import type { AcState } from "@/features/dashboard/use-status"

interface AcHeroCardProps {
  acState: AcState
  lastCommandAt: string | null
  lastCommandResult: "success" | "failure" | null
}

/**
 * The original "live status" hero card -- Power on/off pill, big current
 * temperature, mode + fan pills -- brought back at the user's request
 * after the Dashboard rebuild had replaced it with a today's-on-time stat.
 * Includes the same soft blue ambient wash the pre-rebuild AcStatusCard
 * had while the unit is powered on (radial gradient from top-center,
 * using the dashboard-flat theme's --primary blue instead of --frost).
 */
export function AcHeroCard({ acState, lastCommandAt, lastCommandResult }: AcHeroCardProps) {
  const mode = modeConfig[acState.mode]
  const ModeIcon = mode.icon

  return (
    <Card className="relative gap-2 overflow-hidden p-4">
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 50% -20%, color-mix(in oklch, var(--primary) 38%, transparent), transparent 65%)",
        }}
        animate={{ opacity: acState.power ? 1 : 0 }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
      />

      <div className="relative flex items-center justify-between">
        <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.08em] uppercase">
          Air conditioner
        </p>
        <span
          className={cn(
            "flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold",
            acState.power ? "bg-emerald-500/15 text-emerald-400" : "bg-secondary text-muted-foreground"
          )}
        >
          <Power className="size-3" strokeWidth={2.5} />
          {acState.power ? "On" : "Off"}
        </span>
      </div>

      <div className="relative mt-1 flex items-center justify-between gap-3">
        <p className="text-[42px] leading-none font-bold tracking-tight tabular-nums">
          {acState.temperature}
          <span className="text-muted-foreground align-top text-lg font-semibold">°</span>
        </p>

        <div className="flex flex-col items-end gap-1.5">
          <span
            className={cn(
              "bg-secondary flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold",
              mode.className
            )}
          >
            <ModeIcon className="size-3.5" />
            {mode.label}
          </span>
          <span className="bg-secondary text-muted-foreground flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium">
            <Wind className="size-3.5" />
            Fan {fanConfig[acState.fan].label}
          </span>
        </div>
      </div>

      {lastCommandAt && (
        <div className="border-border relative mt-1 border-t pt-2.5">
          <p className="text-muted-foreground flex items-center gap-1.5 text-[12px]">
            {lastCommandResult === "failure" ? (
              <XCircle className="text-destructive size-3.5" />
            ) : (
              <CheckCircle2 className="size-3.5 text-emerald-400" />
            )}
            Last command {formatDistanceToNow(new Date(lastCommandAt), { addSuffix: true })}
            {lastCommandResult === "failure" && " · failed"}
          </p>
        </div>
      )}
    </Card>
  )
}
