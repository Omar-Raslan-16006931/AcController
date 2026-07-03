import { modeConfig, fanConfig } from "@/lib/ac-labels"
import type { Schedule } from "@/features/schedules/use-schedules"
import type { ScheduleAction } from "@/types/database"

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export function repeatLabel(schedule: Pick<Schedule, "repeat" | "custom_days" | "run_date">): string {
  switch (schedule.repeat) {
    case "once":
      return schedule.run_date ? `Once · ${schedule.run_date}` : "Once"
    case "daily":
      return "Every day"
    case "weekdays":
      return "Weekdays"
    case "weekends":
      return "Weekends"
    case "custom":
      return (schedule.custom_days ?? []).map((d) => WEEKDAY_LABELS[d]).join(", ") || "Custom"
    default:
      return schedule.repeat
  }
}

export function actionSummary(action: ScheduleAction): string {
  if (!action.power) return "Turn off"
  const parts = ["Turn on"]
  if (action.temperature != null) parts.push(`${action.temperature}°C`)
  if (action.mode) parts.push(modeConfig[action.mode].label)
  if (action.fan) parts.push(`${fanConfig[action.fan].label} fan`)
  return parts.join(" · ")
}

export function formatTime(time: string): string {
  // Postgres returns "HH:MM:SS" — render as a localized "h:mm AM/PM".
  const [h, m] = time.split(":").map(Number)
  const date = new Date()
  date.setHours(h, m, 0, 0)
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
}
