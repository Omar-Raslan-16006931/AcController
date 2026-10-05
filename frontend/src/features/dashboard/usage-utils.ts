import { format } from "date-fns"

import type { AcUsageDayDetail, AcUsageInterval } from "@/features/dashboard/use-ac-usage-detail"
import type { AcMode, FanSpeed } from "@/types/database"

export const MS_PER_MIN = 60_000
export const MS_PER_HOUR = 3_600_000

export function dayTotalMs(day: AcUsageDayDetail | undefined): number {
  if (!day) return 0
  return day.intervals.reduce((sum, iv) => sum + (iv.endMs - iv.startMs), 0)
}

/** A real on-period: back-to-back intervals (temperature/fan changes while
 * running) are merged so one session = one time the AC was switched on. */
export interface Session {
  startMs: number
  endMs: number
  ongoing: boolean
  /** The settings segments inside this session (temperature / fan / mode
   * changes while it ran). */
  intervals: AcUsageInterval[]
}

export function sessionsOf(day: AcUsageDayDetail | undefined): Session[] {
  if (!day) return []
  const out: Session[] = []
  for (const iv of day.intervals) {
    const last = out[out.length - 1]
    if (last && iv.startMs - last.endMs < MS_PER_MIN) {
      last.endMs = iv.endMs
      last.ongoing = iv.ongoing
      last.intervals.push(iv)
    } else {
      out.push({ startMs: iv.startMs, endMs: iv.endMs, ongoing: iv.ongoing, intervals: [iv] })
    }
  }
  return out
}

/** "22°" or "21–23°" for the temperatures used during a session. */
export function tempRangeLabel(intervals: AcUsageInterval[]): string | null {
  const temps = intervals.map((iv) => iv.temperature).filter((t): t is number => t != null)
  if (!temps.length) return null
  const lo = Math.min(...temps)
  const hi = Math.max(...temps)
  return lo === hi ? `${lo}°` : `${lo}–${hi}°`
}

/** "27 min", "1h 05m" */
export function formatDuration(ms: number): string {
  const total = Math.round(ms / MS_PER_MIN)
  if (total < 60) return `${total} min`
  return `${Math.floor(total / 60)}h ${String(total % 60).padStart(2, "0")}m`
}

export function formatClock(ms: number): string {
  return format(new Date(ms), "h:mm a")
}

/** Duration-weighted average temperature, or null with no data. */
export function avgTemp(intervals: AcUsageInterval[]): number | null {
  let sum = 0
  let weight = 0
  for (const iv of intervals) {
    if (iv.temperature == null) continue
    const d = iv.endMs - iv.startMs
    sum += iv.temperature * d
    weight += d
  }
  return weight > 0 ? sum / weight : null
}

/** The value of `key` that ran the longest across the given intervals. */
export function mostUsed<K extends "mode" | "fan">(
  intervals: AcUsageInterval[],
  key: K
): (K extends "mode" ? AcMode : FanSpeed) | null {
  const totals = new Map<string, number>()
  for (const iv of intervals) {
    const v = iv[key]
    if (!v) continue
    totals.set(v, (totals.get(v) ?? 0) + (iv.endMs - iv.startMs))
  }
  let best: string | null = null
  let bestMs = -1
  for (const [v, ms] of totals) {
    if (ms > bestMs) {
      best = v
      bestMs = ms
    }
  }
  return best as (K extends "mode" ? AcMode : FanSpeed) | null
}

export function dayStartMs(day: AcUsageDayDetail): number {
  return new Date(`${day.date}T00:00:00`).getTime()
}
