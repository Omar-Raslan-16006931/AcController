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
    <div className="grid grid-cols-3 gap-3">
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
            whileTap={{ scale: 0.95 }}
            className={cn(
              "flex flex-col items-center gap-2 rounded-2xl border py-4 text-sm font-medium transition-colors disabled:opacity-50",
              active
                ? "border-primary bg-primary/10 text-primary"
                : "border-border hover:bg-accent/60 text-foreground/80"
            )}
            aria-pressed={active}
          >
            <Icon className={cn("size-6", active ? "" : config.className)} />
            {config.label}
          </motion.button>
        )
      })}
    </div>
  )
}
