import { useQuery } from "@tanstack/react-query"

import { supabase } from "@/lib/supabase"
import { useAuth } from "@/context/auth-context"

const LOOKBACK_DAYS = 8 // fetch one extra day of context so day-1's "on since" state is known
const TRAILING_DAYS = 7 // days averaged for the weekly figure

interface PowerEvent {
  power: boolean
  created_at: string
}

function dayKey(d: Date): string {
  // Local calendar day (matches how the rest of the app displays dates).
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

/** Splits an [start, end) "on" interval into per-local-day millisecond chunks. */
function splitByDay(startMs: number, endMs: number, out: Map<string, number>) {
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
    out.set(key, (out.get(key) ?? 0) + (chunkEnd - cursor))
    cursor = chunkEnd
  }
}

export interface AcUsageSummary {
  /** Seconds the AC has been on today (local calendar day), including if still on right now. */
  todaySeconds: number
  /** Average on-seconds/day across the trailing 7 local calendar days (today included). */
  weekAverageSeconds: number
  /** Per-day breakdown, oldest first, for the trailing 7 days. */
  days: { date: string; seconds: number }[]
}

/**
 * Derives "how long has the AC been running" purely from command_history's
 * power on/off transitions -- there's no dedicated usage-tracking table, so
 * this walks the last ~8 days of power events chronologically, treating
 * each power:true -> power:false (or power:true -> now, if still on) span
 * as an "on" interval, and buckets those intervals into local calendar
 * days (splitting any interval that crosses midnight).
 */
export function useAcUsage() {
  const { user } = useAuth()
  const userId = user?.id

  return useQuery({
    queryKey: ["ac-usage", userId],
    queryFn: async (): Promise<AcUsageSummary> => {
      const since = new Date()
      since.setDate(since.getDate() - LOOKBACK_DAYS)

      const { data, error } = await supabase
        .from("command_history")
        .select("power, created_at")
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: true })

      if (error) throw error
      const events = (data ?? []) as PowerEvent[]

      const onMsByDay = new Map<string, number>()
      let onSinceMs: number | null = null

      for (const event of events) {
        const eventMs = new Date(event.created_at).getTime()
        if (event.power) {
          if (onSinceMs === null) onSinceMs = eventMs
        } else if (onSinceMs !== null) {
          splitByDay(onSinceMs, eventMs, onMsByDay)
          onSinceMs = null
        }
      }
      // Still on right now -- count up to this instant.
      if (onSinceMs !== null) {
        splitByDay(onSinceMs, Date.now(), onMsByDay)
      }

      const days: { date: string; seconds: number }[] = []
      const today = new Date()
      for (let i = TRAILING_DAYS - 1; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i)
        const key = dayKey(d)
        days.push({ date: key, seconds: Math.round((onMsByDay.get(key) ?? 0) / 1000) })
      }

      const todaySeconds = days[days.length - 1]?.seconds ?? 0
      const weekAverageSeconds = Math.round(
        days.reduce((sum, d) => sum + d.seconds, 0) / days.length
      )

      return { todaySeconds, weekAverageSeconds, days }
    },
    enabled: !!userId,
    // AC usage doesn't need to be real-time-precise -- refresh alongside
    // the rest of the dashboard's normal polling cadence instead of on
    // every render.
    staleTime: 60_000,
    refetchInterval: 60_000,
  })
}
