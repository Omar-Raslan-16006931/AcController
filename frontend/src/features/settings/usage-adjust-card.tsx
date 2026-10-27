import { RotateCcw } from "lucide-react"

import { dayTotalMs, formatDuration, MS_PER_MIN } from "@/features/dashboard/usage-utils"
import { useAcUsageDetail } from "@/features/dashboard/use-ac-usage-detail"
import { setDayAdjustment, useUsageAdjustments } from "@/features/dashboard/usage-adjustment"

const STEPS = [15, 30, 60]

/** Settings > Today's hours: take minutes off today's "AC on" total. */
export function UsageAdjustCard() {
  const { data: days } = useAcUsageDetail()
  const adjustments = useUsageAdjustments()

  const today = days?.[days.length - 1]
  const date = today?.date
  const removed = (date && adjustments[date]) || 0
  const shownMin = Math.round(dayTotalMs(today) / MS_PER_MIN)

  const reduce = (step: number) => {
    if (!date || shownMin <= 0) return
    setDayAdjustment(date, removed + Math.min(step, shownMin))
  }

  return (
    <div className="glass rounded-[20px] px-3.5 py-3">
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[13px] font-semibold">Today&apos;s hours</div>
          <div className="text-muted-foreground text-[11.5px]">
            {days ? `${formatDuration(shownMin * MS_PER_MIN)} on today` : "Loading…"}
            {removed > 0 && ` · ${formatDuration(removed * MS_PER_MIN)} removed`}
          </div>
        </div>
        <button
          type="button"
          onClick={() => date && setDayAdjustment(date, 0)}
          disabled={removed === 0}
          className="flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-white/10 px-3 text-[12px] font-semibold transition-opacity disabled:cursor-default disabled:opacity-35"
        >
          <RotateCcw className="size-3.5" />
          Reset
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {STEPS.map((step) => (
          <button
            key={step}
            type="button"
            onClick={() => reduce(step)}
            disabled={shownMin <= 0}
            className="h-9 cursor-pointer rounded-full bg-white/10 text-[12.5px] font-semibold transition-opacity active:opacity-70 disabled:cursor-default disabled:opacity-35"
          >
            − {step < 60 ? `${step} min` : "1 hour"}
          </button>
        ))}
      </div>
      <p className="text-muted-foreground mt-2 text-[11px]">
        Fixes hours when the AC was logged on longer than it really ran. Saved on this device; the history itself is not changed.
      </p>
    </div>
  )
}
