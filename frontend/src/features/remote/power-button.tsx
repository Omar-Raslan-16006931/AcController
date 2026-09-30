import { Power, PowerOff } from "lucide-react"

import { cn } from "@/lib/utils"

const base =
  "flex h-10 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full text-[13px] font-semibold transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none active:opacity-80 disabled:pointer-events-none disabled:opacity-40"

/**
 * Two independent buttons instead of one toggle: IR is one-way and
 * occasionally lossy, so either can be tapped again, and neither is
 * disabled while a request is in flight.
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
    <div className="flex w-full items-center gap-2">
      <button
        type="button"
        disabled={!connected}
        onClick={onPowerOn}
        aria-pressed={on}
        aria-label="Turn AC on"
        className={cn(
          base,
          on
            ? "bg-primary text-primary-foreground shadow-[0_4px_14px_-4px_var(--frost)]"
            : "bg-secondary text-muted-foreground hover:text-foreground"
        )}
      >
        <Power className="size-4" strokeWidth={2.25} />
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
          !on ? "bg-foreground text-background" : "bg-secondary text-muted-foreground hover:text-foreground"
        )}
      >
        <PowerOff className="size-4" strokeWidth={2.25} />
        Off
      </button>
    </div>
  )
}
