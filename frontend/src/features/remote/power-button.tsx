import * as React from "react"
import { Power } from "lucide-react"

import { cn } from "@/lib/utils"

/** Retriggers the ripple / sheen / icon-redraw animation on a .pbtn. */
export function useFire() {
  const [key, setKey] = React.useState(0)
  const fire = React.useCallback(() => setKey((k) => k + 1), [])
  return { fireKey: key, fire }
}

function FireLayers() {
  return (
    <>
      <span className="pbtn-ring" aria-hidden />
      <span className="pbtn-sheen" aria-hidden />
    </>
  )
}

/** Separate On and Off buttons; the active one is lit green / red. */
export function PowerButtons({
  on,
  onPowerOn,
  onPowerOff,
  disabled,
}: {
  on: boolean
  onPowerOn: () => void
  onPowerOff: () => void
  disabled?: boolean
}) {
  const [fired, setFired] = React.useState<{ which: "on" | "off"; n: number } | null>(null)

  const press = (which: "on" | "off") => {
    setFired((f) => ({ which, n: (f?.n ?? 0) + 1 }))
    if (which === "on") onPowerOn()
    else onPowerOff()
  }

  const btn = (which: "on" | "off") => {
    const active = which === "on" ? on : !on
    return (
      <button
        // Remounting on each press restarts the CSS animation cleanly.
        key={fired?.which === which ? `${which}-${fired.n}` : which}
        type="button"
        disabled={disabled}
        onClick={() => press(which)}
        className={cn(
          "pbtn glass flex h-[42px] cursor-pointer items-center justify-center gap-2 rounded-[15px] text-[14px] font-semibold disabled:cursor-not-allowed disabled:opacity-60",
          fired?.which === which && "fire",
          active ? (which === "on" ? "power-on" : "power-off") : "text-muted-foreground"
        )}
      >
        <FireLayers />
        <Power className="size-4" strokeWidth={2.1} />
        {which === "on" ? "On" : "Off"}
      </button>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-1.5">
      {btn("on")}
      {btn("off")}
    </div>
  )
}

/** Single round power toggle used on the Home AC card. */
export function PowerToggle({
  on,
  onToggle,
  disabled,
}: {
  on: boolean
  onToggle: () => void
  disabled?: boolean
}) {
  const { fireKey, fire } = useFire()
  return (
    <button
      key={fireKey}
      type="button"
      aria-label={on ? "Turn off" : "Turn on"}
      aria-pressed={on}
      disabled={disabled}
      onClick={() => {
        fire()
        onToggle()
      }}
      className={cn(
        "pbtn glass flex size-[50px] shrink-0 cursor-pointer items-center justify-center rounded-full disabled:opacity-60",
        fireKey > 0 && "fire",
        on ? "power-on" : "text-muted-foreground"
      )}
    >
      <FireLayers />
      <Power className="size-[21px]" strokeWidth={2.1} />
    </button>
  )
}
