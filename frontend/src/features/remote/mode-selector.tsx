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
    <div className="bg-secondary flex items-center gap-0.5 rounded-xl p-1">
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
              "relative flex-1 cursor-pointer rounded-[9px] py-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
              active ? "text-foreground" : "text-muted-foreground hover:text-foreground/80"
            )}
            aria-pressed={active}
          >
            {active && (
              <motion.span
                layoutId="mode-active-pill"
                className="bg-card absolute inset-0 rounded-[9px] shadow-sm dark:bg-white/12"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative flex items-center justify-center gap-1">
              <Icon className={cn("size-3.5", active && "text-frost")} />
              {config.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
