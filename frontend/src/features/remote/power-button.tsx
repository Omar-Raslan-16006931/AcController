import { motion, AnimatePresence } from "framer-motion"
import { Power, PowerOff } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Two independent, compact buttons instead of one toggle. IR is a one-way,
 * occasionally-lossy signal, so the user needs to be able to mash
 * "Power On" or "Power Off" repeatedly to make sure the AC actually
 * receives the command - neither is ever disabled while a request is in
 * flight, and clicking doesn't depend on the current reported state.
 *
 * Each button now carries a small live-state indicator dot (pulsing while
 * active) in its corner, on top of the existing tap-scale feedback, as a
 * more modern "this is the current state" affordance.
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
      <motion.button
        type="button"
        disabled={!connected}
        onClick={onPowerOn}
        whileTap={{ scale: 0.94 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className={cn(
          "relative flex h-10 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full text-[13px] font-semibold transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40",
          on
            ? "bg-primary text-primary-foreground shadow-[0_4px_14px_-4px_var(--frost)]"
            : "bg-secondary text-muted-foreground hover:text-foreground"
        )}
        aria-pressed={on}
        aria-label="Turn AC on"
      >
        <Power className="size-4" strokeWidth={2.25} />
        On
        <AnimatePresence>
          {on && (
            <motion.span
              key="on-indicator"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
              className="absolute top-1.5 right-2.5 flex size-1.5"
              aria-hidden
            >
              <span className="bg-success/70 absolute inline-flex h-full w-full animate-ping rounded-full" />
              <span className="bg-success relative inline-flex size-1.5 rounded-full" />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      <motion.button
        type="button"
        disabled={!connected}
        onClick={onPowerOff}
        whileTap={{ scale: 0.94 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className={cn(
          "relative flex h-10 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full text-[13px] font-semibold transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40",
          !on ? "bg-foreground text-background" : "bg-secondary text-muted-foreground hover:text-foreground"
        )}
        aria-pressed={!on}
        aria-label="Turn AC off"
      >
        <PowerOff className="size-4" strokeWidth={2.25} />
        Off
        <AnimatePresence>
          {!on && (
            <motion.span
              key="off-indicator"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
              className="bg-background/80 absolute top-1.5 right-2.5 size-1.5 rounded-full"
              aria-hidden
            />
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  )
}
