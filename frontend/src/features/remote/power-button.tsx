import { Power } from "lucide-react"

import { cn } from "@/lib/utils"

const base =
  "flex h-14 flex-1 cursor-pointer items-center justify-center gap-2 rounded-[1rem] text-[15px] font-semibold transition-colors duration-300 ease-out outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40"

/**
 * Two independent buttons instead of one toggle: IR is one-way and
 * occasionally lossy, so either can be tapped again to make sure the AC
 * hears it, and neither is disabled while a request is in flight. The one
 * matching the last known state carries the fill; the other stays tonal.
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
    <div className="flex w-full items-center gap-2.5">
      <button
        type="button"
        disabled={!connected}
        onClick={onPowerOn}
        aria-pressed={on}
        aria-label="Turn AC on"
        className={cn(
          base,
          on
            ? "bg-primary text-primary-foreground active:bg-primary/80"
            : "bg-secondary text-muted-foreground hover:text-foreground active:bg-raised"
        )}
      >
        <Power className="size-[18px]" strokeWidth={2.4} />
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
            ? "bg-raised text-foreground active:bg-raised/70"
            : "bg-secondary text-muted-foreground hover:text-foreground active:bg-raised"
        )}
      >
        Off
      </button>
    </div>
  )
}
