import { formatDistanceToNow } from "date-fns"

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
 * Live status: the set temperature as the big display numeral, one line of
 * state beside it, and when the last command went out. Hierarchy comes from
 * type size and tone, not from chips.
 */
export function AcHeroCard({ acState, lastCommandAt, lastCommandResult }: AcHeroCardProps) {
  const mode = modeConfig[acState.mode] ?? modeConfig.cool
  const fan = fanConfig[acState.fan]
  const tone = acState.mode === "heat" ? "text-heat" : acState.mode === "dry" ? "text-warning" : "text-primary"

  return (
    <Card className="gap-0 px-5 pt-5 pb-4">
      <div className="flex items-end justify-between gap-4">
        <p className="font-heading tnum relative text-[88px] leading-[0.85] font-medium tracking-[-0.03em]">
          {acState.temperature}
          <span
            aria-hidden
            className={cn(
              "absolute top-1 left-full ml-1 text-[28px] transition-colors duration-500",
              acState.power ? tone : "text-muted-foreground"
            )}
          >
            °
          </span>
        </p>

        <div className="pb-1 text-right">
          <p className={cn("text-[15px] font-medium", acState.power ? "text-foreground" : "text-muted-foreground")}>
            {acState.power ? "Running" : "Off"}
          </p>
          <p className="text-muted-foreground mt-0.5 text-[13px]">
            {mode.label} · {fan?.label ?? acState.fan} fan
          </p>
        </div>
      </div>

      {lastCommandAt && (
        <p className="text-muted-foreground mt-5 text-[12px]">
          {lastCommandResult === "failure" ? (
            <span className="text-destructive">Last command failed </span>
          ) : (
            "Last command "
          )}
          {formatDistanceToNow(new Date(lastCommandAt), { addSuffix: true })}
        </p>
      )}
    </Card>
  )
}
