import * as React from "react"
import { CheckIcon, RotateCcw } from "lucide-react"

import { cn } from "@/lib/utils"
import { BACKGROUND_PRESETS, DEFAULT_BACKGROUND, useTheme } from "@/context/theme-context"

/**
 * Settings > Background: six preset palettes, a custom colour picker (one
 * colour in, a full two-glow palette out), and a reset to the default.
 * Changes apply instantly and are remembered on this device.
 */
export function BackgroundCard() {
  const { background, setBackground, setCustomBackground, resetBackground } = useTheme()
  const isCustom = background.id === "custom"
  const isDefault = background.id === DEFAULT_BACKGROUND.id && !isCustom
  const inputRef = React.useRef<HTMLInputElement>(null)

  return (
    <div className="glass rounded-[20px] px-3.5 py-3">
      <div className="mb-2.5 flex items-center justify-between">
        <div>
          <div className="text-[13px] font-semibold">Background</div>
          <div className="text-muted-foreground text-[11.5px]">
            {isCustom ? "Custom colour" : background.label}
          </div>
        </div>
        <button
          type="button"
          onClick={resetBackground}
          disabled={isDefault}
          className="flex h-8 cursor-pointer items-center gap-1.5 rounded-full bg-white/10 px-3 text-[12px] font-semibold transition-opacity disabled:cursor-default disabled:opacity-35"
        >
          <RotateCcw className="size-3.5" />
          Reset
        </button>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {BACKGROUND_PRESETS.map((p) => {
          const active = background.id === p.id
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setBackground(p)}
              aria-pressed={active}
              aria-label={p.label}
              className="flex cursor-pointer flex-col items-center gap-1"
            >
              <span
                className={cn(
                  "relative flex h-12 w-full items-center justify-center overflow-hidden rounded-[14px] transition-shadow",
                  active ? "shadow-[0_0_0_2px_#fff]" : "shadow-[inset_0_0_0_1px_rgba(255,255,255,.12)]"
                )}
                style={{
                  background: `radial-gradient(90% 90% at 20% 15%, ${p.a}, transparent 70%), radial-gradient(80% 80% at 90% 90%, ${p.b}, transparent 70%), ${p.base}`,
                }}
              >
                {active && <CheckIconclassName="size-4" strokeWidth={2.6} />}
              </span>
              <span className={cn("text-[10.5px] font-medium", active ? "text-foreground" : "text-muted-foreground")}>
                {p.label}
              </span>
            </button>
          )
        })}

        {/* Custom: a real colour input sits on top of the swatch, invisible,
            so tapping the swatch opens the iOS / browser colour picker. */}
        <label className="flex cursor-pointer flex-col items-center gap-1">
          <span
            className={cn(
              "relative flex h-12 w-full items-center justify-center overflow-hidden rounded-[14px]",
              isCustom ? "shadow-[0_0_0_2px_#fff]" : "shadow-[inset_0_0_0_1px_rgba(255,255,255,.12)]"
            )}
            style={{
              background: isCustom
                ? `radial-gradient(90% 90% at 20% 15%, ${background.a}, transparent 70%), radial-gradient(80% 80% at 90% 90%, ${background.b}, transparent 70%), ${background.base}`
                : "conic-gradient(from 0deg, #ff5a4f, #ffb547, #3ee08f, #4b9dff, #8b5cf6, #ff5a4f)",
            }}
          >
            {isCustom ? <CheckIconclassName="size-4" strokeWidth={2.6} /> : <span className="text-[18px] leading-none font-light">+</span>}
            <input
              ref={inputRef}
              type="color"
              aria-label="Pick a custom background colour"
              value={isCustom ? background.a : "#2a5bd7"}
              onChange={(e) => setCustomBackground(e.target.value)}
              className="absolute inset-0 size-full cursor-pointer opacity-0"
            />
          </span>
          <span className={cn("text-[10.5px] font-medium", isCustom ? "text-foreground" : "text-muted-foreground")}>
            Custom
          </span>
        </label>
      </div>
    </div>
  )
}
