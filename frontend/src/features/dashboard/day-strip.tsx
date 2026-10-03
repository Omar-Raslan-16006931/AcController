import { cn } from "@/lib/utils"
import { tempRampColor } from "@/lib/temp-ramp"
import type { AcUsageDayDetail } from "@/features/dashboard/use-ac-usage-detail"
import { dayStartMs } from "@/features/dashboard/usage-utils"

const DAY_MS = 86_400_000

/** 24-hour strip: every interval at its real time of day, coloured by the
 * temperature it was set to, with a white "now" marker on today. */
export function DayStrip({ day, isToday, big }: { day: AcUsageDayDetail; isToday?: boolean; big?: boolean }) {
  const start = dayStartMs(day)
  const nowPct = isToday ? ((Date.now() - start) / DAY_MS) * 100 : null

  return (
    <div>
      <div
        className={cn(
          "relative overflow-hidden bg-white/[0.06]",
          big ? "h-[22px] rounded-[7px]" : "h-[14px] rounded-[5px]"
        )}
      >
        {day.intervals.map((iv, i) => (
          <i
            key={i}
            className="absolute inset-y-0 min-w-[3px] rounded-[3px]"
            style={{
              left: `${((iv.startMs - start) / DAY_MS) * 100}%`,
              width: `${((iv.endMs - iv.startMs) / DAY_MS) * 100}%`,
              background: iv.temperature != null ? tempRampColor(iv.temperature) : "var(--primary)",
            }}
          />
        ))}
        {nowPct !== null && (
          <span className="absolute -inset-y-px w-[2px] rounded-[1px] bg-white" style={{ left: `${nowPct}%` }} />
        )}
      </div>
      <div className="text-faint num mt-[3px] flex justify-between text-[9.5px]">
        <span>12a</span>
        <span>6a</span>
        <span>12p</span>
        <span>6p</span>
        <span>12a</span>
      </div>
    </div>
  )
}
