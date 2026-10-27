import * as React from "react"

import type { AcUsageDayDetail, AcUsageInterval } from "@/features/dashboard/use-ac-usage-detail"

/**
 * Manual corrections to a day's "hours on" (Settings > Today's hours): the
 * AC can be logged as on for longer than it really ran (e.g. switched off
 * with the real remote), so the user can take minutes off a day.
 *
 * Kept on this device (localStorage), applied when the usage data is built,
 * so every total, chart and the timeline follow it. The logged history
 * itself is never changed.
 */
const STORAGE_KEY = "ac.usage.adjust.v1"
const MS_PER_MIN = 60_000

type Adjustments = Record<string, number> // "YYYY-MM-DD" -> minutes removed

let current: Adjustments = read()
const listeners = new Set<() => void>()

function read(): Adjustments {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? (JSON.parse(raw) as Adjustments) : {}
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    return {}
  }
}

function write(next: Adjustments) {
  current = next
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Storage blocked: the adjustment just lasts until the app closes.
  }
  listeners.forEach((fn) => fn())
}

export function setDayAdjustment(date: string, minutes: number) {
  const next = { ...current }
  if (minutes > 0) next[date] = Math.round(minutes)
  else delete next[date]
  write(next)
}

export function useUsageAdjustments(): Adjustments {
  return React.useSyncExternalStore(
    (fn) => {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    () => current
  )
}

/** Takes `minutes` off a day's intervals, newest first. */
function trimDay(intervals: AcUsageInterval[], minutes: number): AcUsageInterval[] {
  let remaining = minutes * MS_PER_MIN
  const out = intervals.map((iv) => ({ ...iv }))
  for (let i = out.length - 1; i >= 0 && remaining > 0; i--) {
    const iv = out[i]!
    const cut = Math.min(remaining, iv.endMs - iv.startMs)
    // A running interval keeps ending "now"; the others lose their tail.
    if (iv.ongoing) iv.startMs += cut
    else iv.endMs -= cut
    remaining -= cut
  }
  return out.filter((iv) => iv.endMs > iv.startMs)
}

export function applyAdjustments(days: AcUsageDayDetail[], adjustments: Adjustments): AcUsageDayDetail[] {
  if (!Object.keys(adjustments).length) return days
  return days.map((day) => {
    const minutes = adjustments[day.date]
    return minutes ? { ...day, intervals: trimDay(day.intervals, minutes) } : day
  })
}
