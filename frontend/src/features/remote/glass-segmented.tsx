import * as React from "react"

import { cn } from "@/lib/utils"

export interface SegmentItem<T extends string> {
  value: T
  label: string
  icon?: React.ReactNode
}

/** Glass segmented control with a sliding glass lens under the active item. */
export function GlassSegmented<T extends string>({
  items,
  value,
  onChange,
  disabled,
  size = "md",
}: {
  items: SegmentItem<T>[]
  value: T
  onChange: (value: T) => void
  disabled?: boolean
  size?: "sm" | "md"
}) {
  const index = Math.max(
    0,
    items.findIndex((i) => i.value === value)
  )
  const n = items.length

  return (
    <div
      className={cn(
        "glass relative grid p-[3px]",
        size === "sm" ? "rounded-[13px]" : "rounded-[15px]",
        disabled && "opacity-50"
      )}
      style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden
        className="absolute top-[3px] bottom-[3px] left-[3px] transition-transform duration-500 ease-[cubic-bezier(.34,1.45,.5,1)]"
        style={{ width: `calc((100% - 6px) / ${n})`, transform: `translateX(${index * 100}%)` }}
      >
        <span
          key={index}
          className={cn("lens lens-stretch absolute inset-0", size === "sm" ? "rounded-[10px]" : "rounded-[12px]")}
        />
      </span>
      {items.map((item) => {
        const on = item.value === value
        return (
          <button
            key={item.value}
            type="button"
            disabled={disabled}
            aria-pressed={on}
            onClick={() => onChange(item.value)}
            className={cn(
              "relative flex cursor-pointer flex-col items-center justify-center gap-0.5 font-semibold transition-colors duration-200 disabled:cursor-not-allowed",
              size === "sm" ? "h-[28px] text-[11.5px]" : "h-[40px] text-[10.5px]",
              on ? "text-foreground [&_svg]:text-ice" : "text-muted-foreground"
            )}
          >
            {item.icon && <span className="flex h-[17px] items-center">{item.icon}</span>}
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
