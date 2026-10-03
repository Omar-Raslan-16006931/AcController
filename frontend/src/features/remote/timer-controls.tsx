import * as React from "react"
import { Power, TimerReset, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { useCountdown } from "@/hooks/use-countdown"
import { useTimers, useCreateTimer, useCancelTimer, type Timer } from "@/features/timers/use-timers"

const PRESET_MINUTES = [15, 30, 60, 120]
const MIN_MINUTES = 1
const MAX_MINUTES = 240

type Action = "turn_on" | "turn_off"

function formatMinutes(total: number): string {
  if (total < 60) return `${total} min`
  const hours = Math.floor(total / 60)
  const minutes = total % 60
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`
}

function clockAfter(minutes: number): string {
  const d = new Date(Date.now() + minutes * 60_000)
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
}

function ActiveTimerRow({ timer, onCancel }: { timer: Timer; onCancel: () => void }) {
  const { label } = useCountdown(timer.fires_at)
  const isOff = timer.action === "turn_off"

  return (
    <div className="glass flex h-[38px] items-center gap-2 rounded-[12px] pr-1.5 pl-2.5">
      <span
        className={cn(
          "flex size-[22px] shrink-0 items-center justify-center rounded-full",
          isOff ? "bg-[rgba(255,106,95,.16)] text-[#ff6a5f]" : "bg-[rgba(62,224,143,.16)] text-[#3ee08f]"
        )}
      >
        <Power className="size-3" strokeWidth={2.2} />
      </span>
      <p className="min-w-0 flex-1 truncate text-[12px] font-medium">{isOff ? "Turning off" : "Turning on"}</p>
      <span className="num text-[13px] font-semibold">{label}</span>
      <button
        type="button"
        onClick={onCancel}
        aria-label="Cancel timer"
        className="text-muted-foreground hover:text-foreground flex size-[26px] cursor-pointer items-center justify-center rounded-full"
      >
        <X className="size-3.5" />
      </button>
    </div>
  )
}

/**
 * Same flow as before: "Turn on after" / "Turn off after" open a panel with
 * a 1 min to 4 h slider and presets; active timers list below with cancel.
 */
export function TimerControls() {
  const { data: timers } = useTimers()
  const createTimer = useCreateTimer()
  const cancelTimer = useCancelTimer()

  const [open, setOpen] = React.useState<Action | null>(null)
  const [minutes, setMinutes] = React.useState(30)

  const activeTimers = timers ?? []
  const pct = ((minutes - MIN_MINUTES) / (MAX_MINUTES - MIN_MINUTES)) * 100

  const toggle = (action: Action) => setOpen((o) => (o === action ? null : action))

  const start = () => {
    if (!open) return
    createTimer.mutate({ action: open, seconds: minutes * 60 })
    setOpen(null)
  }

  return (
    <div className="w-full">
      <div className="grid grid-cols-2 gap-1.5">
        {(["turn_on", "turn_off"] as const).map((action) => {
          const isOff = action === "turn_off"
          return (
            <button
              key={action}
              type="button"
              onClick={() => toggle(action)}
              aria-expanded={open === action}
              className={cn(
                "glass flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-[12px] text-[12px] font-semibold transition-colors",
                open === action && "bg-white/[0.18]"
              )}
            >
              <Power className={cn("size-3.5", isOff ? "text-[#ff6a5f]" : "text-[#3ee08f]")} strokeWidth={2.2} />
              {isOff ? "Turn off after" : "Turn on after"}
            </button>
          )
        })}
      </div>

      {/* grid-rows 0fr -> 1fr gives a real height animation with no JS measuring. */}
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-400 ease-[cubic-bezier(.3,.8,.3,1)]",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <div className="glass mt-1.5 rounded-[16px] px-3 pt-2.5 pb-3">
            <div className="flex items-baseline justify-between">
              <span className="num text-[26px] font-light tracking-[-0.6px]">{formatMinutes(minutes)}</span>
              <span className="text-muted-foreground text-[11px]">
                turns {open === "turn_on" ? "on" : "off"} at {clockAfter(minutes)}
              </span>
            </div>
            <input
              type="range"
              aria-label="Minutes"
              className="glass-range mt-1"
              min={MIN_MINUTES}
              max={MAX_MINUTES}
              step={1}
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
              style={{ "--p": `${pct}%` } as React.CSSProperties}
            />
            <div className="mt-1 grid grid-cols-4 gap-1.5">
              {PRESET_MINUTES.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setMinutes(preset)}
                  className={cn(
                    "h-[26px] cursor-pointer rounded-[8px] text-[11px] font-semibold transition-colors",
                    minutes === preset ? "bg-ice text-[#06223a]" : "text-muted-foreground bg-white/[0.07]"
                  )}
                >
                  {formatMinutes(preset)}
                </button>
              ))}
            </div>
            <button
              type="button"
              disabled={createTimer.isPending}
              onClick={start}
              className={cn(
                "mt-2 h-[34px] w-full cursor-pointer rounded-[11px] text-[12.5px] font-semibold text-white disabled:opacity-60",
                open === "turn_on" ? "power-on" : "power-off"
              )}
            >
              Start timer
            </button>
          </div>
        </div>
      </div>

      <div className="mt-1.5 flex flex-col gap-1.5">
        {activeTimers.length === 0 ? (
          <div className="text-muted-foreground flex items-center justify-center gap-1.5 py-1 text-[11px]">
            <TimerReset className="size-3.5" />
            No active timers
          </div>
        ) : (
          activeTimers.map((timer) => (
            <ActiveTimerRow key={timer.id} timer={timer} onCancel={() => cancelTimer.mutate(timer.id)} />
          ))
        )}
      </div>
    </div>
  )
}
