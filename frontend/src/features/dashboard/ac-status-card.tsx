import { formatDistanceToNow } from "date-fns"
import { motion } from "framer-motion"
import { Power, Wind, CheckCircle2, XCircle } from "lucide-react"

import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { modeConfig, fanConfig } from "@/lib/ac-labels"
import type { StatusResponse } from "@/features/dashboard/use-status"

/**
 * Hero status card, styled like an iOS Home-app accessory tile: soft brand
 * wash when the unit is running, a big centred temperature, and mode/fan as
 * compact pills. Tightened (smaller temp, less padding) as part of the
 * dashboard compaction pass so it doesn't dominate the fold on mobile.
 */
export function AcStatusCard({ status }: { status: StatusResponse }) {
  const { ac_state: ac, last_command_result, last_command_at } = status
  const mode = modeConfig[ac.mode]
  const ModeIcon = mode.icon

  return (
    <Card className="relative gap-0 overflow-hidden p-3.5">
      {/* Ambient wash while powered on */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 50% -20%, color-mix(in oklch, var(--frost) 16%, transparent), transparent 70%)",
        }}
        animate={{ opacity: ac.power ? 1 : 0 }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
      />

      <div className="relative flex items-center justify-between">
        <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.06em] uppercase">
          Air Conditioner
        </p>
        <span
          className={cn(
            "flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
            ac.power ? "bg-success/15 text-success" : "bg-secondary text-muted-foreground"
          )}
        >
          <Power className="size-3" strokeWidth={2.5} />
          {ac.power ? "On" : "Off"}
        </span>
      </div>

      <div className="relative mt-1.5 flex items-center justify-between gap-3">
        <motion.p
          key={ac.temperature}
          initial={{ scale: 0.9, opacity: 0.5 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 320, damping: 22 }}
          className="font-heading text-[42px] font-bold leading-none tracking-tight tabular-nums"
        >
          {ac.temperature}
          <span className="text-muted-foreground align-top text-xl font-semibold">°</span>
        </motion.p>

        <div className="flex flex-col items-end gap-1">
          <span
            className={cn(
              "bg-secondary flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
              mode.className
            )}
          >
            <ModeIcon className="size-3.5" />
            {mode.label}
          </span>
          <span className="bg-secondary text-muted-foreground flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium">
            <Wind className="size-3.5" />
            Fan {fanConfig[ac.fan].label}
          </span>
        </div>
      </div>

      {last_command_at && (
        <div className="text-muted-foreground border-border/60 relative mt-2.5 flex items-center gap-1.5 border-t pt-2.5 text-[11px]">
          {last_command_result === "success" ? (
            <CheckCircle2 className="text-success size-3.5" />
          ) : (
            <XCircle className="text-destructive size-3.5" />
          )}
          Last command {formatDistanceToNow(new Date(last_command_at), { addSuffix: true })}
          {last_command_result === "failure" && " · failed"}
        </div>
      )}
    </Card>
  )
}
