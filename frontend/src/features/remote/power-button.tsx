import { motion } from "framer-motion"
import { Power } from "lucide-react"

import { cn } from "@/lib/utils"

export function PowerButton({
  on,
  disabled,
  onToggle,
}: {
  on: boolean
  disabled?: boolean
  onToggle: () => void
}) {
  return (
    <motion.button
      type="button"
      disabled={disabled}
      onClick={onToggle}
      whileTap={{ scale: 0.94 }}
      className={cn(
        "relative flex size-32 items-center justify-center rounded-full shadow-lg transition-colors duration-300 focus-visible:ring-4 focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-50 sm:size-36",
        on ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
      )}
      aria-pressed={on}
      aria-label={on ? "Turn AC off" : "Turn AC on"}
    >
      {on && (
        <motion.span
          layoutId="power-glow"
          className="bg-primary/30 absolute inset-0 rounded-full blur-xl"
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      <Power className="relative size-12 sm:size-14" strokeWidth={2.25} />
    </motion.button>
  )
}
