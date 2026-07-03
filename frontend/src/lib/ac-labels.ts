import { Snowflake, Flame, Droplets, type LucideIcon } from "lucide-react"

import type { AcMode, FanSpeed } from "@/types/database"

export const modeConfig: Record<AcMode, { label: string; icon: LucideIcon; className: string }> = {
  cool: { label: "Cool", icon: Snowflake, className: "text-sky-500" },
  heat: { label: "Heat", icon: Flame, className: "text-orange-500" },
  dry: { label: "Dry", icon: Droplets, className: "text-amber-500" },
}

export const fanConfig: Record<FanSpeed, { label: string }> = {
  low: { label: "Low" },
  medium: { label: "Medium" },
  high: { label: "High" },
}

export const modeOrder: AcMode[] = ["cool", "heat", "dry"]
export const fanOrder: FanSpeed[] = ["low", "medium", "high"]
