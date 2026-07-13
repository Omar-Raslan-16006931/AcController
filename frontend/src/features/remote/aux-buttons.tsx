import { motion } from "framer-motion"
import { Lightbulb, Sparkles } from "lucide-react"

import { cn } from "@/lib/utils"
import { useToggleLight, useTriggerSelfClean } from "@/features/remote/use-aux-control"

/**
 * Momentary buttons for the real remote's Light and Self Clean buttons --
 * neither reflects a persistent AcState field (see use-aux-control.ts), so
 * unlike PowerButtons/ModeSelector/FanSelector there's no "current value"
 * to highlight, just a tap-and-fire affordance with its own pending spinner
 * state.
 */
export function AuxButtons({ disabled = false }: { disabled?: boolean }) {
  const toggleLight = useToggleLight()
  const selfClean = useTriggerSelfClean()

  return (
    <div className="flex w-full items-center gap-2">
      <motion.button
        type="button"
        disabled={disabled || toggleLight.isPending}
        onClick={() => toggleLight.mutate()}
        whileTap={{ scale: 0.94 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className={cn(
          "bg-secondary text-muted-foreground hover:text-foreground flex h-9 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full text-[12px] font-semibold transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40"
        )}
        aria-label="Toggle AC display light"
      >
        <Lightbulb className="size-3.5" strokeWidth={2.25} />
        Light
      </motion.button>

      <motion.button
        type="button"
        disabled={disabled || selfClean.isPending}
        onClick={() => selfClean.mutate()}
        whileTap={{ scale: 0.94 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className={cn(
          "bg-secondary text-muted-foreground hover:text-foreground flex h-9 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full text-[12px] font-semibold transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40"
        )}
        aria-label="Start Self Clean"
      >
        <Sparkles className="size-3.5" strokeWidth={2.25} />
        Self Clean
      </motion.button>
    </div>
  )
}
