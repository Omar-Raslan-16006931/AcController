import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Power, PowerOff, TimerReset, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useCountdown } from "@/hooks/use-countdown"
import { useTimers, useCreateTimer, useCancelTimer, type Timer } from "@/features/timers/use-timers"

const PRESET_MINUTES = [15, 30, 60, 120]
const MIN_MINUTES = 1
const MAX_MINUTES = 240

function formatMinutes(total: number): string {
  if (total < 60) return `${total} min`
  const hours = Math.floor(total / 60)
  const minutes = total % 60
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`
}

/**
 * "Turn on/off after" -- opens a small popover with a duration slider and
 * quick presets. Used twice below with opposite `action`s.
 */
function TimerPopoverButton({
  action,
  onCreate,
  submitting,
}: {
  action: "turn_on" | "turn_off"
  onCreate: (seconds: number) => void
  submitting: boolean
}) {
  const [open, setOpen] = React.useState(false)
  const [minutes, setMinutes] = React.useState(30)
  const isOff = action === "turn_off"
  const Icon = isOff ? PowerOff : Power

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="border-border bg-card active:bg-secondary flex h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl border text-[14px] font-semibold transition-colors duration-150 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <Icon className={cn("size-4", isOff ? "text-destructive" : "text-success")} strokeWidth={2.4} />
          {isOff ? "Off after…" : "On after…"}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(18rem,calc(100vw-2rem))] rounded-2xl p-4" collisionPadding={16}>
        <p className="text-muted-foreground text-center text-[12px] font-semibold tracking-wide uppercase">
          {isOff ? "Turn off after" : "Turn on after"}
        </p>
        <p className="font-heading mt-1 text-center text-3xl font-bold tabular-nums">{formatMinutes(minutes)}</p>
        <Slider
          className="mt-5"
          value={[minutes]}
          min={MIN_MINUTES}
          max={MAX_MINUTES}
          step={1}
          onValueChange={([v]) => setMinutes(v ?? minutes)}
        />
        <div className="mt-4 grid grid-cols-4 gap-1.5">
          {PRESET_MINUTES.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setMinutes(preset)}
              className={cn(
                "h-9 cursor-pointer rounded-xl text-xs font-semibold transition-colors duration-150",
                minutes === preset ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
              )}
            >
              {formatMinutes(preset)}
            </button>
          ))}
        </div>
        <Button
          type="button"
          className="mt-4 w-full"
          disabled={submitting}
          onClick={() => {
            onCreate(minutes * 60)
            setOpen(false)
          }}
        >
          Start timer
        </Button>
      </PopoverContent>
    </Popover>
  )
}

function ActiveTimerRow({ timer, onCancel }: { timer: Timer; onCancel: () => void }) {
  const { label } = useCountdown(timer.fires_at)
  const isOff = timer.action === "turn_off"

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="overflow-hidden"
    >
      <div className="bg-secondary flex items-center gap-3 rounded-2xl px-3 py-2.5">
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-full",
            isOff ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"
          )}
        >
          {isOff ? <PowerOff className="size-4" /> : <Power className="size-4" />}
        </span>
        <p className="min-w-0 flex-1 truncate text-[14px] font-medium">{isOff ? "Turning off in" : "Turning on in"}</p>
        <span className="text-[15px] font-bold tabular-nums">{label}</span>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancel timer"
          className="text-muted-foreground active:bg-card flex size-9 cursor-pointer items-center justify-center rounded-full transition-colors"
        >
          <X className="size-4" />
        </button>
      </div>
    </motion.div>
  )
}

export function TimerControls() {
  const { data: timers } = useTimers()
  const createTimer = useCreateTimer()
  const cancelTimer = useCancelTimer()

  const activeTimers = timers ?? []

  return (
    <div className="w-full space-y-3">
      <div className="flex w-full items-center gap-3">
        <TimerPopoverButton
          action="turn_on"
          submitting={createTimer.isPending}
          onCreate={(seconds) => createTimer.mutate({ action: "turn_on", seconds })}
        />
        <TimerPopoverButton
          action="turn_off"
          submitting={createTimer.isPending}
          onCreate={(seconds) => createTimer.mutate({ action: "turn_off", seconds })}
        />
      </div>

      {activeTimers.length === 0 ? (
        <p className="text-muted-foreground flex items-center justify-center gap-1.5 text-[13px]">
          <TimerReset className="size-4" />
          No active timers
        </p>
      ) : (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {activeTimers.map((timer) => (
              <ActiveTimerRow key={timer.id} timer={timer} onCancel={() => cancelTimer.mutate(timer.id)} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
