import { Snowflake, Flame, Droplets, Fan, type LucideIcon } from "lucide-react"

import type { AcMode, FanSpeed, CommandSource } from "@/types/database"

// The backend attributes every Siri Shortcuts / Shortcuts-app command with
// source="system" (see backend/app/routers/shortcuts.py) -- there's no
// separate "siri" value in the CHECK constraint, so this is the frontend's
// only place that turns that into a label a user actually recognizes,
// instead of the literal, confusing word "System".
export const commandSourceLabels: Record<CommandSource, string> = {
  manual: "App",
  schedule: "Schedule",
  timer: "Timer",
  system: "Siri Shortcut",
}

export const modeConfig: Record<AcMode, { label: string; icon: LucideIcon; className: string }> = {
  cool: { label: "Cool", icon: Snowflake, className: "text-sky-500" },
  heat: { label: "Heat", icon: Flame, className: "text-orange-500" },
  dry: { label: "Dry", icon: Droplets, className: "text-amber-500" },
}

// Same Fan icon for every speed -- differentiated by icon size (see
// fan-selector.tsx) so low/medium/high still read as visually distinct
// without needing three unrelated icon glyphs.
export const fanConfig: Record<FanSpeed, { label: string; icon: LucideIcon; iconSize: string }> = {
  low: { label: "Low", icon: Fan, iconSize: "size-3" },
  medium: { label: "Medium", icon: Fan, iconSize: "size-3.5" },
  high: { label: "High", icon: Fan, iconSize: "size-4" },
}

export const modeOrder: AcMode[] = ["cool", "heat", "dry"]
export const fanOrder: FanSpeed[] = ["low", "medium", "high"]
