import { useQuery } from "@tanstack/react-query"

import { supabase } from "@/lib/supabase"
import { useAuth } from "@/context/auth-context"
import type { AcMode, FanSpeed } from "@/types/database"

const LOOKBACK_DAYS = 8 // one extra day of context, same reasoning as use-ac-usage.ts
const TRAILING_DAYS = 7

interface CommandEvent {
  power: boolean
  temperature: number | null
  mode: AcMode | null
  fan: FanSpeed | null
  created_at: string
}

export interface AcUsageInterval {
  startMs: number
  endMs: number
  ongoing: boolean
  temperature: number | null
  mode: AcMode | null
  fan: FanSpeed | null
}

export interface AcUsageDayDetail {
  date: string
  intervals: AcUsageInterval[]
}

function dayKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

/** Same day-boundary split as use-ac-usage.ts, but keeps the interval's
 * temperature/mode/fan attached to every day-chunk instead of collapsing
 * to a duration total. */
function splitIntervalByDay(
  startMs: number,
  endMs: number,
  ongoing: boolean,
  state: { temperature: number | null; mode: AcMode | null; fan: FanSpeed | null },
  out: Map<string, AcUsageInterval[]>
) {
  let cursor = startMs
  while (cursor < endMs) {
    const cursorDate = new Date(cursor)
    const nextMidnight = new Date(
      cursorDate.getFullYear(),
      cursorDate.getMonth(),
      cursorDate.getDate() + 1
    ).getTime()
    const chunkEnd = Math.min(endMs, nextMidnight)
    const key = dayKey(cursorDate)
    const list = out.get(key) ?? []
    list.push({
      startMs: cursor,
      endMs: chunkEnd,
      ongoing: ongoing && chunkEnd === endMs,
      temperature: state.temperature,
      mode: state.mode,
      fan: state.fan,
    })
    out.set(key, list)
    cursor = chunkEnd
  }
}

/** Collapses back-to-back intervals that carry the exact same
 * temperature/mode/fan into a single interval. A "repeated" button press
 * (e.g. tapping Low three times in a row) is still logged as its own
 * command_history row, but it's not a real state change -- without this,
 * every no-op tap showed up as its own separate entry in the timeline.
 * Only merges when the two intervals are truly back-to-back (no gap),
 * so a real off-then-on-again session that happens to reuse the same
 * settings later is kept as two distinct sessions. */
function mergeNoOpIntervals(intervals: AcUsageInterval[]): AcUsageInterval[] {
  const merged: AcUsageInterval[] = []
  for (const iv of intervals) {
    const last = merged[merged.length - 1]
    const sameState =
      last &&
      last.temperature === iv.temperature &&
      last.mode === iv.mode &&
      last.fan === iv.fan &&
      last.endMs === iv.startMs
    if (sameState && last) {
      last.endMs = iv.endMs
      last.ongoing = iv.ongoing
    } else {
      merged.push({ ...iv })
    }
  }
  return merged
}

/**
 * Powers the "Details" view on the dashboard's AC usage card -- unlike
 * use-ac-usage.ts (which only needs total on-seconds per day), this keeps
 * every on/off interval plus the temperature/mode/fan in effect during it,
 * so a user can see "2:00 PM - 5:00 PM, 24°C, Cool, Medium" for a given day.
 *
 * A new interval segment starts whenever temperature/mode/fan changes
 * while the AC is on (not just on power:true/false), so a session where the
 * user nudges the temperature mid-run shows up as two back-to-back
 * intervals rather than one interval mislabeled with only its starting
 * state.
 */
export function useAcUsageDetail(enabled = true) {
  const { user } = useAuth()
  const userId = user?.id

  return useQuery({
    queryKey: ["ac-usage-detail", userId],
    queryFn: async (): Promise<AcUsageDayDetail[]> => {
      const since = new Date()
      since.setDate(since.getDate() - LOOKBACK_DAYS)

      const { data, error } = await supabase
        .from("command_history")
        .select("power, temperature, mode, fan, created_at")
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: true })

      if (error) throw error
      const events = (data ?? []) as CommandEvent[]

      const byDay = new Map<string, AcUsageInterval[]>()
      let isOn = false
      let segStart: number | null = null
      const state: { temperature: number | null; mode: AcMode | null; fan: FanSpeed | null } = {
        temperature: null,
        mode: null,
        fan: null,
      }

      const closeSegment = (endMs: number, ongoing: boolean) => {
        if (segStart !== null && endMs > segStart) {
          splitIntervalByDay(segStart, endMs, ongoing, { ...state }, byDay)
        }
      }

      for (const event of events) {
        const t = new Date(event.created_at).getTime()

        const stateChanged =
          (event.temperature != null && event.temperature !== state.temperature) ||
          (event.mode != null && event.mode !== state.mode) ||
          (event.fan != null && event.fan !== state.fan)

        if (isOn && stateChanged) {
          closeSegment(t, false)
          segStart = t
        }

        if (event.temperature != null) state.temperature = event.temperature
        if (event.mode != null) state.mode = event.mode
        if (event.fan != null) state.fan = event.fan

        if (event.power === true && !isOn) {
          isOn = true
          segStart = t
        } else if (event.power === false && isOn) {
          closeSegment(t, false)
          isOn = false
          segStart = null
        }
      }
      if (isOn) closeSegment(Date.now(), true)

      const days: AcUsageDayDetail[] = []
      const today = new Date()
      for (let i = TRAILING_DAYS - 1; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i)
        const key = dayKey(d)
        const rawIntervals = (byDay.get(key) ?? []).sort((a, b) => a.startMs - b.startMs)
        days.push({ date: key, intervals: mergeNoOpIntervals(rawIntervals) })
      }

      return days
    },
    enabled: !!userId && enabled,
    staleTime: 60_000,
  })
}
