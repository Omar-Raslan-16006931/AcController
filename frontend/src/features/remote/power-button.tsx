import { motion } from "framer-motion"
import { Power, PowerOff } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Two independent, minimal pills instead of one toggle. IR is a one-way,
 * occasionally-lossy signal, so the user needs to be able to mash
 * "Power On" or "Power Off" repeatedly to make sure the AC actually
 * receives the command — neither is ever disabled while a request is in
 * flight, and clicking doesn't depend on the current reported state.
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
    <div className="flex items-center gap-2.5">
      <motion.button
        type="button"
        disabled={!connected}
        onClick={onPowerOn}
        whileTap={{ scale: 0.96 }}
        className={cn(
          "flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-medium transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40",
          on
            ? "bg-frost/15 text-frost border-frost/30 border"
            : "bg-secondary/60 text-muted-foreground hover:text-foreground border border-transparent"
        )}
        aria-pressed={on}
        aria-label="Turn AC on"
      >
        <Power className="size-4" strokeWidth={2.25} />
        On
      </motion.button>

      <motion.button
        type="button"
        disabled={!connected}
        onClick={onPowerOff}
        whileTap={{ scale: 0.96 }}
        className={cn(
          "flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-medium transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40",
          !on
            ? "bg-secondary text-foreground border-border border"
            : "bg-secondary/60 text-muted-foreground hover:text-foreground border border-transparent"
        )}
        aria-pressed={!on}
        aria-label="Turn AC off"
      >
        <PowerOff className="size-4" strokeWidth={2.25} />
        Off
      </motion.button>
    </div>
  )
}
