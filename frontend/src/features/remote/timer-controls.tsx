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
          className="bg-secondary text-foreground/90 hover:bg-raised active:bg-raised/70 flex h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-[1rem] text-[14px] font-medium transition-colors duration-200 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <Icon className="text-muted-foreground size-4" strokeWidth={2} />
          {isOff ? "Off after" : "On after"}
        </button>
      </PopoverTrigger>
      <PopoverContent className="bg-popover w-[min(18rem,calc(100vw-2rem))] rounded-[1.25rem] border-0 p-4" collisionPadding={16}>
        <p className="text-muted-foreground text-center text-[13px]">{isOff ? "Turn off after" : "Turn on after"}</p>
        <p className="font-heading tnum mt-1 text-center text-[40px] leading-none font-medium">{formatMinutes(minutes)}</p>
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
                "h-9 cursor-pointer rounded-[0.75rem] text-[13px] font-medium transition-colors duration-200",
                minutes === preset ? "bg-raised text-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
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
      initial={{ y: 8 }}
      animate={{ y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ type: "spring", stiffness: 420, damping: 34 }}
      className="overflow-hidden"
    >
      <div className="bg-secondary flex items-center gap-3 rounded-[1rem] py-2 pr-1.5 pl-4">
        {isOff ? (
          <PowerOff className="text-muted-foreground size-4 shrink-0" />
        ) : (
          <Power className="text-primary size-4 shrink-0" />
        )}
        <p className="text-muted-foreground min-w-0 flex-1 truncate text-[14px]">
          {isOff ? "Turning off in" : "Turning on in"}
        </p>
        <span className="font-heading tnum text-[20px] leading-none font-medium">{label}</span>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancel timer"
          className="text-muted-foreground hover:text-foreground active:bg-raised flex size-9 cursor-pointer items-center justify-center rounded-full transition-colors"
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
