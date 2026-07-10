import * as React from "react"
import { formatDistanceToNow } from "date-fns"
import { CheckCircle2, XCircle } from "lucide-react"
import { motion, useSpring } from "framer-motion"

import { Card } from "@/components/ui/card"
import { modeConfig } from "@/lib/ac-labels"
import type { AcState } from "@/features/dashboard/use-status"

/** Animates a number counting up from 0 to `value` on mount/change, rather
 * than snapping straight to the final figure -- matches the "count-up"
 * behavior asked for on the hero stat. */
function useCountUp(value: number, decimals: number) {
  const spring = useSpring(0, { stiffness: 90, damping: 20, mass: 0.6 })
  const [display, setDisplay] = React.useState("0")

  React.useEffect(() => {
    spring.set(value)
  }, [spring, value])

  React.useEffect(() => {
    return spring.on("change", (latest) => {
      setDisplay(latest.toFixed(decimals))
    })
  }, [spring, decimals])

  return display
}

interface AcHeroCardProps {
  acState: AcState
  todayHours: number
  lastCommandAt: string | null
  lastCommandResult: "success" | "failure" | null
}

export function AcHeroCard({ acState, todayHours, lastCommandAt, lastCommandResult }: AcHeroCardProps) {
  const displayHours = useCountUp(todayHours, 1)
  const mode = modeConfig[acState.mode]
  const ModeIcon = mode.icon

  return (
    <Card className="gap-2 p-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.08em] uppercase">
          Air conditioner
        </p>
        <span className="bg-primary/15 text-primary flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold">
          <ModeIcon className="size-3" />
          {mode.label} · {acState.temperature}°C
        </span>
      </div>

      <div className="flex items-end justify-between">
        <p className="flex items-baseline gap-1 font-bold tabular-nums">
          <span className="text-[42px] leading-none tracking-tight">{displayHours}</span>
          <span className="text-lg leading-none">h</span>
        </p>
        <p className="text-muted-foreground pb-1 text-[12px]">cooling today</p>
      </div>

      {lastCommandAt && (
        <div className="border-border mt-1 border-t pt-2.5">
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-muted-foreground flex items-center gap-1.5 text-[12px]"
          >
            {lastCommandResult === "failure" ? (
              <XCircle className="text-destructive size-3.5" />
            ) : (
              <CheckCircle2 className="text-emerald-400 size-3.5" />
            )}
            Last command {formatDistanceToNow(new Date(lastCommandAt), { addSuffix: true })}
            {lastCommandResult === "failure" && " · failed"}
          </motion.p>
        </div>
      )}
    </Card>
  )
}
