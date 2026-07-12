import { useMemo } from "react"

import type { FanSpeed } from "@/types/database"
import { estimateEgpCost, estimateKwh } from "@/lib/energy"
import { useAcUsageDetail, type AcUsageDayDetail } from "@/features/dashboard/use-ac-usage-detail"

export interface DayBar {
  date: string
  hours: number
  isToday: boolean
}

export interface FanDistributionEntry {
  fan: FanSpeed
  hours: number
  percent: number
}

export interface DashboardAnalytics {
  todayHours: number
  todaySessions: number
  weekAverageHours: number
  weekBars: DayBar[]
  fanDistribution: FanDistributionEntry[]
  weekKwh: number
  weekCostEgp: number
  peakHourLabel: string
  weekAvgTemp: number | null
  days: AcUsageDayDetail[]
}

const FAN_ORDER: FanSpeed[] = ["eco", "low", "medium", "high"]
const MS_PER_HOUR = 3_600_000

function hoursOf(day: AcUsageDayDetail | undefined): number {
  if (!day) return 0
  return day.intervals.reduce((sum, iv) => sum + (iv.endMs - iv.startMs), 0) / MS_PER_HOUR
}

function formatHour(hour: number): string {
  const h = hour % 24
  if (h === 0) return "12 AM"
  if (h === 12) return "12 PM"
  const twelveHour = h % 12
  return `${twelveHour} ${h < 12 ? "AM" : "PM"}`
}

/**
 * Everything the new flat/dark analytics Dashboard needs, derived entirely
 * from useAcUsageDetail's trailing-7-day interval data (same source the old
 * AcUsageCard used) -- no separate hooks or duplicate Supabase queries.
 */
export function useDashboardAnalytics() {
  const { data: days, isLoading, isError, refetch, isFetching } = useAcUsageDetail()

  const analytics = useMemo<DashboardAnalytics | null>(() => {
    if (!days || days.length === 0) return null

    const weekBars: DayBar[] = days.map((day, i) => ({
      date: day.date,
      hours: hoursOf(day),
      isToday: i === days.length - 1,
    }))

    const todayDay = days[days.length - 1]
    const todayHours = hoursOf(todayDay)
    const todaySessions = todayDay?.intervals.length ?? 0
    const weekAverageHours = weekBars.reduce((sum, bar) => sum + bar.hours, 0) / weekBars.length

    const fanMs: Record<FanSpeed, number> = { eco: 0, low: 0, medium: 0, high: 0 }
    const hourBucketsMs = new Array(24).fill(0) as number[]
    let totalOnMs = 0
    let tempWeightedSum = 0
    let tempWeightMs = 0

    for (const day of days) {
      for (const interval of day.intervals) {
        const durationMs = interval.endMs - interval.startMs
        totalOnMs += durationMs
        if (interval.fan) fanMs[interval.fan] += durationMs
        if (interval.temperature != null) {
          tempWeightedSum += interval.temperature * durationMs
          tempWeightMs += durationMs
        }

        // Bucket this interval's on-time into hour-of-day slots, splitting
        // at each hour boundary it crosses, so a 11:30pm-1:30am session
        // contributes correctly to both hour 23 and hour 0/1.
        let cursor = interval.startMs
        while (cursor < interval.endMs) {
          const cursorDate = new Date(cursor)
          const hour = cursorDate.getHours()
          const nextHourBoundary = new Date(
            cursorDate.getFullYear(),
            cursorDate.getMonth(),
            cursorDate.getDate(),
            hour + 1
          ).getTime()
          const chunkEnd = Math.min(interval.endMs, nextHourBoundary)
          hourBucketsMs[hour]! += chunkEnd - cursor
          cursor = chunkEnd
        }
      }
    }

    const fanDistribution: FanDistributionEntry[] = FAN_ORDER.map((fan) => ({
      fan,
      hours: fanMs[fan] / MS_PER_HOUR,
      percent: totalOnMs > 0 ? Math.round((fanMs[fan] / totalOnMs) * 100) : 0,
    }))

    // Busiest contiguous 2-hour window across the week (doesn't wrap
    // midnight -- a real edge case, but not one worth the complexity here).
    let bestHour = 0
    let bestSum = -1
    for (let hour = 0; hour < 23; hour++) {
      const sum = hourBucketsMs[hour]! + hourBucketsMs[hour + 1]!
      if (sum > bestSum) {
        bestSum = sum
        bestHour = hour
      }
    }
    const peakHourLabel = `${formatHour(bestHour)} – ${formatHour(bestHour + 2)}`

    const weekAvgTemp = tempWeightMs > 0 ? Math.round(tempWeightedSum / tempWeightMs) : null
    const weekHours = totalOnMs / MS_PER_HOUR
    const weekKwh = estimateKwh(weekHours)
    const weekCostEgp = estimateEgpCost(weekHours)

    return {
      todayHours,
      todaySessions,
      weekAverageHours,
      weekBars,
      fanDistribution,
      weekKwh,
      weekCostEgp,
      peakHourLabel,
      weekAvgTemp,
      days,
    }
  }, [days])

  return { analytics, isLoading, isError, refetch, isFetching }
}
