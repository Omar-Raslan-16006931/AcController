import { motion } from "framer-motion"

import { cn } from "@/lib/utils"
import { modeConfig, modeOrder } from "@/lib/ac-labels"
import type { AcMode } from "@/types/database"

export function ModeSelector({
  value,
  disabled,
  onChange,
}: {
  value: AcMode
  disabled?: boolean
  onChange: (mode: AcMode) => void
}) {
  return (
    <div className="bg-secondary/60 flex items-center gap-1 rounded-full p-1">
      {modeOrder.map((mode) => {
        const config = modeConfig[mode]
        const Icon = config.icon
        const active = value === mode
        return (
          <motion.button
            key={mode}
            type="button"
            disabled={disabled}
            onClick={() => onChange(mode)}
            whileTap={disabled ? undefined : { scale: 0.94 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className={cn(
              "relative flex-1 cursor-pointer rounded-full py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
              active ? "text-foreground" : "text-muted-foreground hover:text-foreground/80"
            )}
            aria-pressed={active}
          >
            {active && (
              <motion.span
                layoutId="mode-active-pill"
                className="border-frost bg-frost/10 absolute inset-0 rounded-full border-2"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative flex items-center justify-center gap-1">
              <Icon className={cn("size-3.5", active && "text-frost")} />
              {config.label}
            </span>
          </motion.button>
        )
      })}
    </div>
  )
}
