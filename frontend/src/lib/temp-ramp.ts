import type { FanSpeed } from "@/types/database"

/**
 * The Dashboard analytics screen's one multi-color system besides the
 * single accent blue: four shades of blue, cooler (deeper/darker) to
 * warmer (lighter/brighter). Reused two ways:
 *  - Per-session temperature chips/radial-dial arcs: interpolated across
 *    the hardware's confirmed valid range (20-28C).
 *  - Fan-mode weekly distribution: eco/low/med/high mapped straight to
 *    the 4 stops, so "lower fan speed" and "cooler shade" both read as
 *    the same visual language without introducing a second palette.
 */
const TEMP_RAMP_STOPS = ["#3C86D8", "#4C9EF0", "#5AC8FA", "#7CD9FF"] as const

const TEMP_MIN = 20
const TEMP_MAX = 28

function hexToRgb(hex: string): [number, number, number] {
  const int = parseInt(hex.slice(1), 16)
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255]
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, "0")).join("")}`
}

function lerpColor(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a)
  const [br, bg, bb] = hexToRgb(b)
  return rgbToHex([ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t])
}

/** Interpolated ramp color for a given temperature in the 20-28C range. */
export function tempRampColor(tempC: number): string {
  const clamped = Math.min(TEMP_MAX, Math.max(TEMP_MIN, tempC))
  const t = (clamped - TEMP_MIN) / (TEMP_MAX - TEMP_MIN)
  const scaled = t * (TEMP_RAMP_STOPS.length - 1)
  const lowerIndex = Math.floor(scaled)
  const upperIndex = Math.min(TEMP_RAMP_STOPS.length - 1, lowerIndex + 1)
  return lerpColor(TEMP_RAMP_STOPS[lowerIndex]!, TEMP_RAMP_STOPS[upperIndex]!, scaled - lowerIndex)
}

export const FAN_RAMP_COLOR: Record<FanSpeed, string> = {
  eco: TEMP_RAMP_STOPS[0],
  low: TEMP_RAMP_STOPS[1],
  medium: TEMP_RAMP_STOPS[2],
  high: TEMP_RAMP_STOPS[3],
}
