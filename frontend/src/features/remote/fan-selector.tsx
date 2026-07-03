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
    <div className="bg-secondary/60 flex items-center gap-1 rounded-2xl p-1">
      {fanOrder.map((fan) => {
        const active = value === fan
        return (
          <button
            key={fan}
            type="button"
            disabled={disabled}
            onClick={() => onChange(fan)}
            className={cn(
              "relative flex-1 cursor-pointer rounded-xl py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
              active ? "text-foreground" : "text-muted-foreground hover:text-foreground/80"
            )}
            aria-pressed={active}
          >
            {active && (
              <motion.span
                layoutId="fan-active-pill"
                className="bg-background absolute inset-0 rounded-xl shadow-sm"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <span className="relative">{fanConfig[fan].label}</span>
          </button>
        )
      })}
    </div>
  )
}
