import { Snowflake, Flame, Droplets, Fan, Leaf, type LucideIcon } from "lucide-react"

import type { AcMode, FanSpeed } from "@/types/database"

export const modeConfig: Record<AcMode, { label: string; icon: LucideIcon; className: string }> = {
  cool: { label: "Cool", icon: Snowflake, className: "text-sky-500" },
  heat: { label: "Heat", icon: Flame, className: "text-orange-500" },
  dry: { label: "Dry", icon: Droplets, className: "text-amber-500" },
  fan: { label: "Fan", icon: Fan, className: "text-slate-500" },
  eco: { label: "Eco", icon: Leaf, className: "text-success" },
}

export const fanConfig: Record<FanSpeed, { label: string }> = {
  low: { label: "Low" },
  medium: { label: "Medium" },
  high: { label: "High" },
  auto: { label: "Auto" },
}

export const modeOrder: AcMode[] = ["cool", "heat", "dry", "fan", "eco"]
export const fanOrder: FanSpeed[] = ["low", "medium", "high", "auto"]
