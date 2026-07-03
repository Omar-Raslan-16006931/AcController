import { motion } from "framer-motion"

import { cn } from "@/lib/utils"
import { fanConfig, fanOrder } from "@/lib/ac-labels"
import type { FanSpeed } from "@/types/database"

export function FanSelector({
  value,
  disabled,
  onChange,
}: {
  value: FanSpeed
  disabled?: boolean
  onChange: (fan: FanSpeed) => void
}) {
  return (
    <div className="bg-secondary flex items-center gap-0.5 rounded-xl p-1">
      {fanOrder.map((fan) => {
        const active = value === fan
        return (
          <button
            key={fan}
            type="button"
            disabled={disabled}
            onClick={() => onChange(fan)}
            className={cn(
              "relative flex-1 cursor-pointer rounded-[9px] py-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
              active ? "text-foreground" : "text-muted-foreground hover:text-foreground/80"
            )}
            aria-pressed={active}
          >
            {active && (
              <motion.span
                layoutId="fan-active-pill"
                className="bg-card absolute inset-0 rounded-[9px] shadow-sm dark:bg-white/12"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative">{fanConfig[fan].label}</span>
          </button>
        )
      })}
    </div>
  )
}
