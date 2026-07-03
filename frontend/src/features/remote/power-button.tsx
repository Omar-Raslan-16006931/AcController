import { motion } from "framer-motion"
import { Power, PowerOff } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Two independent buttons instead of one toggle. IR is a one-way,
 * occasionally-lossy signal, so the user needs to be able to mash
 * "Power On" or "Power Off" repeatedly to make sure the AC actually
 * receives the command — neither button is ever disabled while a
 * request is in flight, and clicking doesn't depend on the current
 * reported state.
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
    <div className="grid grid-cols-2 gap-3">
      <motion.button
        type="button"
        disabled={!connected}
        onClick={onPowerOn}
        whileTap={{ scale: 0.96 }}
        className={cn(
          "relative flex h-24 flex-col items-center justify-center gap-1.5 rounded-2xl text-sm font-semibold shadow-md transition-colors focus-visible:ring-4 focus-visible:ring-ring/50 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40 sm:h-28",
          on ? "brand-gradient text-white shadow-primary/25" : "bg-secondary text-secondary-foreground hover:bg-secondary/70"
        )}
        aria-pressed={on}
        aria-label="Turn AC on"
      >
        {on && (
          <motion.span
            layoutId="power-glow"
            className="bg-glow-orb absolute inset-0 rounded-2xl opacity-60"
            animate={{ opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
        <Power className="relative size-8 sm:size-9" strokeWidth={2.25} />
        <span className="relative">Power On</span>
      </motion.button>

      <motion.button
        type="button"
        disabled={!connected}
        onClick={onPowerOff}
        whileTap={{ scale: 0.96 }}
        className={cn(
          "relative flex h-24 flex-col items-center justify-center gap-1.5 rounded-2xl text-sm font-semibold shadow-md transition-colors focus-visible:ring-4 focus-visible:ring-ring/50 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40 sm:h-28",
          !on
            ? "bg-destructive text-destructive-foreground"
            : "bg-secondary text-secondary-foreground hover:bg-secondary/70"
        )}
        aria-pressed={!on}
        aria-label="Turn AC off"
      >
        <PowerOff className="relative size-8 sm:size-9" strokeWidth={2.25} />
        <span className="relative">Power Off</span>
      </motion.button>
    </div>
  )
}
