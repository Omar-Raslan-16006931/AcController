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
    <div className="bg-muted grid grid-cols-4 gap-1 rounded-2xl p-1">
      {fanOrder.map((fan) => {
        const active = value === fan
        return (
          <motion.button
            key={fan}
            type="button"
            disabled={disabled}
            onClick={() => onChange(fan)}
            whileTap={{ scale: 0.95 }}
            className={cn(
              "rounded-xl py-3 text-sm font-medium transition-colors disabled:opacity-50",
              active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
            aria-pressed={active}
          >
            {fanConfig[fan].label}
          </motion.button>
        )
      })}
    </div>
  )
}
