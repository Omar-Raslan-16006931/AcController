import * as React from "react"
import { motion } from "framer-motion"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

export interface SegmentOption<T extends string> {
  value: T
  label: string
  icon?: LucideIcon
  /** Colour class for the active icon (defaults to the frost accent). */
  activeTone?: string
}

/**
 * Segmented control: a raised plate slides under the selected option
 * (shared layoutId scoped to this instance), and the selected label/icon
 * take on ink + accent. Everything is visible at rest.
 */
export function Segmented<T extends string>({
  label,
  options,
  value,
  disabled,
  onChange,
  size = "md",
}: {
  label?: string
  options: SegmentOption<T>[]
  value: T
  disabled?: boolean
  onChange: (value: T) => void
  size?: "md" | "sm"
}) {
  const id = React.useId()

  return (
    <div className="w-full">
      {label && <p className="text-muted-foreground mb-2 px-1 text-[13px] font-medium">{label}</p>}
      <div
        role="radiogroup"
        aria-label={label}
        className={cn(
          "bg-secondary flex w-full gap-1 rounded-[1rem] p-1 transition-opacity duration-300",
          disabled && "opacity-45"
        )}
      >
        {options.map((option) => {
          const active = option.value === value
          const Icon = option.icon
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => onChange(option.value)}
              className={cn(
                "relative flex min-w-0 flex-1 cursor-pointer items-center justify-center rounded-[0.75rem] font-medium transition-colors duration-200 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed",
                size === "md" ? "h-[3.25rem] flex-col gap-1 text-[12px]" : "h-9 gap-1.5 text-[13px]",
                active ? "text-foreground" : "text-muted-foreground hover:text-foreground/85"
              )}
            >
              {active && (
                <motion.span
                  layoutId={`seg-plate-${id}`}
                  className="bg-raised absolute inset-0 rounded-[0.75rem]"
                  transition={{ type: "spring", stiffness: 520, damping: 40, mass: 0.8 }}
                />
              )}
              {Icon && (
                <Icon
                  className={cn(
                    "relative size-[18px] transition-colors duration-200",
                    active && (option.activeTone ?? "text-primary")
                  )}
                  strokeWidth={active ? 2.2 : 1.8}
                />
              )}
              <span className="relative max-w-full truncate px-1">{option.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
