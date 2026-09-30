import { Card } from "@/components/ui/card"
import { formatEgp } from "@/lib/energy"

interface UsageEnergyCardProps {
  weekKwh: number
  weekCostEgp: number
  peakHourLabel: string
  weekAvgTemp: number | null
}

/** Four figures in a 2x2 grid, each a quiet label over a display numeral. */
export function UsageEnergyCard({ weekKwh, weekCostEgp, peakHourLabel, weekAvgTemp }: UsageEnergyCardProps) {
  const items = [
    { label: "Energy", value: `${weekKwh.toFixed(1)}`, unit: "kWh" },
    { label: "Estimated cost", value: formatEgp(weekCostEgp), unit: "" },
    { label: "Busiest hours", value: peakHourLabel, unit: "" },
    { label: "Average setting", value: weekAvgTemp != null ? `${weekAvgTemp}°` : "None", unit: "" },
  ]

  return (
    <Card className="gap-4 px-5 py-4">
      <p className="text-muted-foreground text-[13px]">This week</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-5">
        {items.map((item) => (
          <div key={item.label} className="min-w-0">
            <p className="text-muted-foreground truncate text-[12px]">{item.label}</p>
            <p className="font-heading tnum mt-1 truncate text-[22px] leading-none font-medium">
              {item.value}
              {item.unit && <span className="text-muted-foreground ml-1 font-sans text-[13px]">{item.unit}</span>}
            </p>
          </div>
        ))}
      </div>
    </Card>
  )
}
