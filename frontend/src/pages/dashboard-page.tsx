import * as React from "react"
import { format } from "date-fns"
import { Clock, WifiOff } from "lucide-react"

import { cn } from "@/lib/utils"
import { PageHeader } from "@/components/page-header"
import { Skeleton } from "@/components/ui/skeleton"
import { ConnectionBadge } from "@/components/layout/connection-badge"
import { modeConfig, fanConfig } from "@/lib/ac-labels"
import { estimateKwh } from "@/lib/energy"
import { useStatus } from "@/features/dashboard/use-status"
import { useAcUsageDetail, type AcUsageDayDetail } from "@/features/dashboard/use-ac-usage-detail"
import { useSetPower } from "@/features/remote/use-ac-control"
import { PowerToggle } from "@/features/remote/power-button"
import { useTimers } from "@/features/timers/use-timers"
import { DayStrip } from "@/features/dashboard/day-strip"
import { DaySheet } from "@/features/dashboard/day-sheet"
import {
  MS_PER_HOUR,
  avgTemp,
  dayTotalMs,
  formatDuration,
  mostUsed,
  sessionsOf,
} from "@/features/dashboard/usage-utils"

const VERBS: Record<string, string> = { cool: "Cooling", heat: "Heating", dry: "Drying" }

/** Three small values side by side with hairline dividers. */
function Trio({ items, className }: { items: { k: string; v: React.ReactNode }[]; className?: string }) {
  return (
    <div className={cn("grid grid-cols-3", className)}>
      {items.map((it, i) => (
        <div key={i} className={cn("min-w-0", i > 0 && "border-l border-white/[0.07] pl-2.5")}>
          <div className="text-muted-foreground text-[10px]">{it.k}</div>
          <div className="num flex min-w-0 items-center gap-1 truncate text-[14px] font-semibold tracking-[-0.2px]">
            {it.v}
          </div>
        </div>
      ))}
    </div>
  )
}

function CardTitleRow({ left, right }: { left: string; right?: React.ReactNode }) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between text-[11.5px] font-semibold">
      <span>{left}</span>
      {right && <span className="text-muted-foreground font-medium">{right}</span>}
    </div>
  )
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86_400)
  if (days >= 1) return `up ${days} day${days > 1 ? "s" : ""}`
  const hours = Math.floor(seconds / 3600)
  return hours >= 1 ? `up ${hours}h` : "just started"
}

export function DashboardPage() {
  const { data: status, isLoading: statusLoading, isError } = useStatus()
  const { data: days, isLoading: daysLoading } = useAcUsageDetail()
  const { data: timers } = useTimers()
  const setPower = useSetPower()
  const [sheetIndex, setSheetIndex] = React.useState<number | null>(null)

  const week = days ?? []
  const today: AcUsageDayDetail | undefined = week[week.length - 1]

  const stats = React.useMemo(() => {
    const totals = week.map(dayTotalMs)
    const weekMs = totals.reduce((a, b) => a + b, 0)
    const all = week.flatMap((d) => d.intervals)
    const todaySessions = sessionsOf(today)
    return {
      totals,
      weekMs,
      maxMs: Math.max(MS_PER_HOUR, ...totals) * 1.05,
      avgMs: week.length ? weekMs / week.length : 0,
      daysUsed: totals.filter((t) => t > 0).length,
      weekTemp: avgTemp(all),
      usualFan: mostUsed(all, "fan"),
      usualMode: mostUsed(all, "mode"),
      todayMs: dayTotalMs(today),
      todaySessions,
      longestMs: todaySessions.reduce((m, s) => Math.max(m, s.endMs - s.startMs), 0),
      // The ongoing session, for "on for 1h 12m".
      ongoing: todaySessions.find((s) => s.ongoing),
    }
  }, [week, today])

  const ac = status?.ac_state
  const on = !!ac?.power
  const nextTimer = (timers ?? [])[0]

  if (statusLoading || daysLoading) {
    return (
      <div>
        <PageHeader title="Home" eyebrow={format(new Date(), "EEEE, d MMMM")} />
        <div className="flex flex-col gap-2.5">
          <Skeleton className="h-[150px] rounded-[20px] bg-white/[0.06]" />
          <Skeleton className="h-[200px] rounded-[20px] bg-white/[0.06]" />
          <Skeleton className="h-[110px] rounded-[20px] bg-white/[0.06]" />
        </div>
      </div>
    )
  }

  const ModeIcon = ac ? modeConfig[ac.mode]?.icon : null
  const FanIcon = ac ? fanConfig[ac.fan]?.icon : null

  return (
    <div>
      <PageHeader title="Home" eyebrow={format(new Date(), "EEEE, d MMMM")} actions={<ConnectionBadge />} />

      <div className="flex flex-col gap-2.5">
        {/* ---- AC ---- */}
        {isError || !ac ? (
          <div className="glass flex flex-col items-center gap-2 rounded-[20px] px-4 py-8 text-center">
            <WifiOff className="text-destructive size-5" />
            <p className="text-sm font-semibold">Can't reach the Pi</p>
            <p className="text-muted-foreground text-xs">Check that it's powered and online.</p>
          </div>
        ) : (
          <div className="glass rounded-[20px] px-3 pt-2.5 pb-2.5 pl-3.5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11.5px] font-semibold">Bedroom AC</div>
                <div
                  className={cn(
                    "num mt-0.5 text-[42px] leading-none font-extralight tracking-[-1.5px] transition-opacity duration-300",
                    !on && "opacity-40"
                  )}
                >
                  {ac.temperature}
                  <sup className="relative top-[4px] ml-0.5 align-top text-[17px] font-light tracking-normal">°</sup>
                </div>
                <div className={cn("mt-1 text-[11.5px] font-semibold", on ? "text-ice" : "text-muted-foreground")}>
                  {on
                    ? `${VERBS[ac.mode] ?? "On"}${
                        stats.ongoing ? ` · on for ${formatDuration(Date.now() - stats.ongoing.startMs)}` : ""
                      }`
                    : "Off"}
                </div>
              </div>
              <PowerToggle on={on} disabled={setPower.isPending} onToggle={() => setPower.mutate(!on)} />
            </div>
            <Trio
              className={cn("mt-2.5 border-t border-white/[0.08] pt-2", !on && "[&_.num]:opacity-50")}
              items={[
                {
                  k: "Mode",
                  v: (
                    <>
                      {ModeIcon && <ModeIcon className="text-ice size-[13px] shrink-0" />}
                      {modeConfig[ac.mode]?.label}
                    </>
                  ),
                },
                {
                  k: "Fan",
                  v: (
                    <>
                      {FanIcon && <FanIcon className="text-ice size-[13px] shrink-0" />}
                      {fanConfig[ac.fan]?.label}
                    </>
                  ),
                },
                {
                  k: "Timer",
                  v: (
                    <>
                      <Clock className="text-ice size-[13px] shrink-0" />
                      {nextTimer
                        ? `${nextTimer.action === "turn_off" ? "Off" : "On"} ${format(new Date(nextTimer.fires_at), "h:mm")}`
                        : "None"}
                    </>
                  ),
                },
              ]}
            />
          </div>
        )}

        {/* ---- This week ---- */}
        {week.length > 0 && (
          <div className="glass rounded-[20px] px-3.5 py-2.5">
            <CardTitleRow left="This week" right={`Avg ${formatDuration(stats.avgMs)} a day`} />
            <div className="grid h-[96px] grid-cols-7 gap-[7px]">
              {week.map((d, i) => {
                const ms = stats.totals[i] ?? 0
                const isToday = i === week.length - 1
                const selected = sheetIndex === i && !isToday
                return (
                  <button
                    key={d.date}
                    type="button"
                    onClick={() => setSheetIndex(i)}
                    aria-label={`${format(new Date(`${d.date}T00:00:00`), "EEEE")}, ${formatDuration(ms)}`}
                    className="flex cursor-pointer flex-col items-center justify-end gap-[5px]"
                  >
                    <span
                      className={cn(
                        "num text-[9.5px] font-semibold",
                        isToday || selected ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {(ms / MS_PER_HOUR).toFixed(1)}
                    </span>
                    <span
                      className={cn(
                        "w-full max-w-[22px] rounded-[6px] transition-colors",
                        isToday
                          ? "bg-[linear-gradient(180deg,#8fd8ff,#3f8cff)]"
                          : selected
                            ? "bg-white/[0.32]"
                            : "bg-white/10"
                      )}
                      style={{ height: `${Math.max(3, (ms / stats.maxMs) * 62)}%` }}
                    />
                    <span
                      className={cn(
                        "text-[10.5px] font-medium",
                        isToday ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {format(new Date(`${d.date}T00:00:00`), "EEEEE")}
                    </span>
                  </button>
                )
              })}
            </div>
            <Trio
              className="mt-2 border-t border-white/[0.07] pt-2"
              items={[
                { k: "Total on", v: formatDuration(stats.weekMs) },
                { k: "Energy", v: `${Math.round(estimateKwh(stats.weekMs / MS_PER_HOUR))} kWh` },
                { k: "Days used", v: `${stats.daysUsed} / ${week.length}` },
              ]}
            />
          </div>
        )}

        {/* ---- Today ---- */}
        {today && (
          <button
            type="button"
            onClick={() => setSheetIndex(week.length - 1)}
            className="glass cursor-pointer rounded-[20px] px-3.5 py-2.5 text-left"
          >
            <CardTitleRow left="Today" right="See all ›" />
            <DayStrip day={today} isToday />
            <Trio
              className="mt-2 border-t border-white/[0.07] pt-2"
              items={[
                { k: "On", v: formatDuration(stats.todayMs) },
                { k: "Sessions", v: String(stats.todaySessions.length) },
                { k: "Longest", v: stats.longestMs ? formatDuration(stats.longestMs) : "–" },
              ]}
            />
          </button>
        )}

        {/* ---- Usual settings ---- */}
        {week.length > 0 && (
          <div className="glass rounded-[20px] px-3.5 py-2.5">
            <Trio
              items={[
                { k: "Avg temp", v: stats.weekTemp != null ? `${stats.weekTemp.toFixed(1)}°` : "–" },
                { k: "Usual fan", v: stats.usualFan ? fanConfig[stats.usualFan].label : "–" },
                { k: "Usual mode", v: stats.usualMode ? modeConfig[stats.usualMode].label : "–" },
              ]}
            />
          </div>
        )}

        {/* ---- System ---- */}
        {status && (
          <div className="glass flex items-center justify-between rounded-[20px] px-3.5 py-2 text-[11.5px] font-medium">
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-[#3ee08f]" />
              Pi {status.system.cpu_temperature_c != null ? `${Math.round(status.system.cpu_temperature_c)}°C` : "online"}
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  status.last_command_result === "failure" ? "bg-destructive" : "bg-[#3ee08f]"
                )}
              />
              IR blaster
            </span>
            <span className="text-muted-foreground">{formatUptime(status.system.uptime_seconds)}</span>
          </div>
        )}
      </div>

      <DaySheet days={week} index={sheetIndex} onIndexChange={setSheetIndex} onClose={() => setSheetIndex(null)} />
    </div>
  )
}
