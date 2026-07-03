import { Minus, Plus } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

import { Button } from "@/components/ui/button"

const MIN_TEMP = 20
const MAX_TEMP = 28

export function TemperatureDial({
  value,
  disabled,
  onChange,
}: {
  value: number
  disabled?: boolean
  onChange: (value: number) => void
}) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative flex h-40 w-full items-center justify-center overflow-hidden">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={value}
            initial={{ opacity: 0, y: 24, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -24, scale: 0.85 }}
            transition={{ type: "spring", stiffness: 350, damping: 26 }}
            className="absolute text-8xl font-semibold tabular-nums"
          >
            {value}
            <span className="text-muted-foreground text-3xl align-top">°C</span>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-6">
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="size-14 rounded-full"
          disabled={disabled || value <= MIN_TEMP}
          onClick={() => onChange(Math.max(MIN_TEMP, value - 1))}
          aria-label="Decrease temperature"
        >
          <Minus className="size-6" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="size-14 rounded-full"
          disabled={disabled || value >= MAX_TEMP}
          onClick={() => onChange(Math.min(MAX_TEMP, value + 1))}
          aria-label="Increase temperature"
        >
          <Plus className="size-6" />
        </Button>
      </div>
      <p className="text-muted-foreground text-xs">Range {MIN_TEMP}°–{MAX_TEMP}°C</p>
    </div>
  )
}

export { MIN_TEMP, MAX_TEMP }
