import { Timer, TrendingUp } from "lucide-react"

import { Card } from "@/components/ui/card"

function formatHours(hours: number): string {
  const totalMinutes = Math.round(hours * 60)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

interface AnalyticsSplitCardProps {
  todayHours: number
  weekAverageHours: number
}

export function AnalyticsSplitCard({ todayHours, weekAverageHours }: AnalyticsSplitCardProps) {
  return (
    <Card className="flex-row gap-0 divide-x divide-border p-0">
      <div className="flex flex-1 items-center gap-2.5 p-3.5">
        <Timer className="text-foreground size-4 shrink-0" />
        <div className="min-w-0">
          <p className="text-muted-foreground truncate text-[11px] leading-tight font-medium">On today</p>
          <p className="text-[15px] leading-tight font-bold tabular-nums">{formatHours(todayHours)}</p>
        </div>
      </div>
      <div className="flex flex-1 items-center gap-2.5 p-3.5">
        <TrendingUp className="text-foreground size-4 shrink-0" />
        <div className="min-w-0">
          <p className="text-muted-foreground truncate text-[11px] leading-tight font-medium">7-day average</p>
          <p className="text-[15px] leading-tight font-bold tabular-nums">{formatHours(weekAverageHours)}</p>
        </div>
      </div>
    </Card>
  )
}
