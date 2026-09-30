import { Power, PowerOff } from "lucide-react"

import { cn } from "@/lib/utils"

const base =
  "flex h-14 flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl text-[15px] font-bold transition-colors duration-150 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40"

/**
 * Two independent buttons instead of one toggle. IR is one-way and
 * occasionally lossy, so either can be tapped repeatedly to make sure the
 * AC receives it -- neither is disabled while a request is in flight. The
 * button matching the last known state is filled; the other is outlined.
 */
export function PowerButtons({
  on,
  connected = true,
  onPowerOn,
  onPowerOff,
}: {
  on: boolean
  connected?: boolean
  onPowerOn: () => void
  onPowerOff: () => void
}) {
  return (
    <div className="flex w-full items-center gap-3">
      <button
        type="button"
        disabled={!connected}
        onClick={onPowerOn}
        aria-pressed={on}
        aria-label="Turn AC on"
        className={cn(
          base,
          on
            ? "bg-primary text-primary-foreground active:bg-primary/85"
            : "bg-card text-foreground border-border active:bg-secondary border"
        )}
      >
        <Power className="size-5" strokeWidth={2.4} />
        On
      </button>

      <button
        type="button"
        disabled={!connected}
        onClick={onPowerOff}
        aria-pressed={!on}
        aria-label="Turn AC off"
        className={cn(
          base,
          !on
            ? "bg-foreground text-background active:bg-foreground/85"
            : "bg-card text-foreground border-border active:bg-secondary border"
        )}
      >
        <PowerOff className="size-5" strokeWidth={2.4} />
        Off
      </button>
    </div>
  )
}
