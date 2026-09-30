import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

export interface SegmentOption<T extends string> {
  value: T
  label: string
  icon: LucideIcon
}

/**
 * Shared segmented control for Mode / Fan: equal-width tiles with an icon
 * above the label. Active tile is a white card with blue icon + text; the
 * rest sit flat on the sand track. Color transitions only -- no sliding or
 * scaling, so there's no motion that can read as a jump.
 */
export function Segmented<T extends string>({
  label,
  options,
  value,
  disabled,
  onChange,
}: {
  label: string
  options: SegmentOption<T>[]
  value: T
  disabled?: boolean
  onChange: (value: T) => void
}) {
  return (
    <div className="w-full">
      <p className="text-muted-foreground mb-1.5 px-1 text-[12px] font-semibold tracking-wide uppercase">
        {label}
      </p>
      <div
        role="radiogroup"
        aria-label={label}
        className={cn("bg-secondary flex w-full gap-1 rounded-2xl p-1", disabled && "opacity-50")}
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
                "flex h-14 min-w-0 flex-1 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl text-[12px] font-semibold transition-colors duration-150 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed",
                active
                  ? "bg-card text-primary shadow-sm"
                  : "text-muted-foreground active:bg-card/60"
              )}
            >
              <Icon className="size-[18px]" strokeWidth={active ? 2.4 : 2} />
              <span className="max-w-full truncate px-1">{option.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
