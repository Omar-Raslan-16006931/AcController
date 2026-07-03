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
    <div className="bg-secondary/60 flex items-center gap-1 rounded-2xl p-1">
      {modeOrder.map((mode) => {
        const config = modeConfig[mode]
        const Icon = config.icon
        const active = value === mode
        return (
          <button
            key={mode}
            type="button"
            disabled={disabled}
            onClick={() => onChange(mode)}
            className={cn(
              "relative flex-1 cursor-pointer rounded-xl py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
              active ? "text-foreground" : "text-muted-foreground hover:text-foreground/80"
            )}
            aria-pressed={active}
          >
            {active && (
              <motion.span
                layoutId="mode-active-pill"
                className="bg-background absolute inset-0 rounded-xl shadow-sm"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <span className="relative flex items-center justify-center gap-1.5">
              <Icon className={cn("size-4", active && "text-frost")} />
              {config.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
