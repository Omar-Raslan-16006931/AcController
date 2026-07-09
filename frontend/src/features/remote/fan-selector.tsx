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
    <div className="bg-secondary/60 flex items-center gap-1 rounded-full p-1">
      {fanOrder.map((fan) => {
        const active = value === fan
        const Icon = fanConfig[fan].icon
        return (
          <motion.button
            key={fan}
            type="button"
            disabled={disabled}
            onClick={() => onChange(fan)}
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
                layoutId="fan-active-pill"
                className="border-frost bg-frost/10 absolute inset-0 rounded-full border-2"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative flex items-center justify-center gap-1">
              <Icon className={cn(fanConfig[fan].iconSize, active && "text-frost")} />
              {fanConfig[fan].label}
            </span>
          </motion.button>
        )
      })}
    </div>
  )
}
