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

/** Two figures side by side on one shared baseline. */
export function AnalyticsSplitCard({ todayHours, weekAverageHours }: AnalyticsSplitCardProps) {
  return (
    <Card className="grid grid-cols-2 gap-0 px-5 py-4">
      <div className="min-w-0">
        <p className="text-muted-foreground text-[13px]">On today</p>
        <p className="font-heading tnum mt-1 text-[30px] leading-none font-medium">{formatHours(todayHours)}</p>
      </div>
      <div className="min-w-0">
        <p className="text-muted-foreground text-[13px]">Daily average</p>
        <p className="font-heading tnum text-foreground/70 mt-1 text-[30px] leading-none font-medium">
          {formatHours(weekAverageHours)}
        </p>
      </div>
    </Card>
  )
}
