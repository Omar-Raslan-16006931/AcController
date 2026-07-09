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
 * "Turn on/off after" — a compact button that opens a dropdown containing a
 * duration slider (plus quick presets) instead of a full modal/page. Used
 * twice below with opposite `action`s.
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
        <motion.button
          type="button"
          whileTap={{ scale: 0.96 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className={cn(
            "border-border/70 bg-secondary/60 hover:bg-secondary flex h-11 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border text-[13px] font-semibold transition-colors",
            "focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-[3px]"
          )}
        >
          <Icon className={cn("size-4", isOff ? "text-destructive" : "text-success")} />
          {isOff ? "Turn off after" : "Turn on after"}
        </motion.button>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <p className="text-center font-heading text-3xl font-bold tabular-nums">
          {formatMinutes(minutes)}
        </p>
        <Slider
          className="mt-4"
          value={[minutes]}
          min={MIN_MINUTES}
          max={MAX_MINUTES}
          step={1}
          onValueChange={([v]) => setMinutes(v ?? minutes)}
        />
        <div className="mt-3 flex flex-wrap gap-1.5">
          {PRESET_MINUTES.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setMinutes(preset)}
              className={cn(
                "flex-1 cursor-pointer rounded-lg py-1.5 text-xs font-semibold transition-colors",
                minutes === preset
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              {formatMinutes(preset)}
            </button>
          ))}
        </div>
        <Button
          type="button"
          variant="brand"
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
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 34 }}
      className="overflow-hidden"
    >
      <div className="bg-secondary/50 flex items-center gap-2.5 rounded-xl px-3 py-2">
        <span
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-full",
            isOff ? "bg-destructive/12 text-destructive" : "bg-success/12 text-success"
          )}
        >
          {isOff ? <PowerOff className="size-3.5" /> : <Power className="size-3.5" />}
        </span>
        <p className="min-w-0 flex-1 truncate text-xs font-medium">
          {isOff ? "Turning off" : "Turning on"}
        </p>
        <span className="text-sm font-semibold tabular-nums">{label}</span>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancel timer"
          className="text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
        >
          <X className="size-3.5" />
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
    <div className="w-full space-y-2">
      <div className="flex w-full items-center gap-2">
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

      <AnimatePresence initial={false}>
        {activeTimers.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-muted-foreground flex items-center justify-center gap-1.5 py-1 text-xs"
          >
            <TimerReset className="size-3.5" />
            No active timers
          </motion.div>
        ) : (
          activeTimers.map((timer) => (
            <ActiveTimerRow
              key={timer.id}
              timer={timer}
              onCancel={() => cancelTimer.mutate(timer.id)}
            />
          ))
        )}
      </AnimatePresence>
    </div>
  )
}
