import * as React from "react"

/**
 * Theme + living-background state.
 *
 * The app is night-glass only now, so "theme" is kept purely for API
 * compatibility (the Settings form still stores it in Supabase) and the
 * document is always dark. What the user CAN change is the background
 * colour, persisted in localStorage and applied as CSS variables that the
 * <NightBackground /> field reads.
 */

type Theme = "light" | "dark" | "system"

export interface BackgroundPalette {
  id: string
  label: string
  /** Main colour: the big glow at the top. */
  a: string
  /** Second glow, lower right. */
  b: string
  /** Base fill under everything. */
  base: string
}

export const BACKGROUND_PRESETS: BackgroundPalette[] = [
  { id: "ocean", label: "Ocean", a: "#123a86", b: "#07646e", base: "#03070e" },
  { id: "midnight", label: "Midnight", a: "#1b2a6b", b: "#2a1f5c", base: "#04050d" },
  { id: "forest", label: "Forest", a: "#0f5a45", b: "#1d4a2a", base: "#020a07" },
  { id: "ember", label: "Ember", a: "#7a2e14", b: "#5c1d2e", base: "#0c0504" },
  { id: "graphite", label: "Graphite", a: "#2c3440", b: "#1c242c", base: "#050608" },
  { id: "rose", label: "Rose", a: "#6b1f4a", b: "#3a1f6b", base: "#0a0409" },
]

export const DEFAULT_BACKGROUND = BACKGROUND_PRESETS[0]!

interface ThemeContextValue {
  theme: Theme
  resolvedTheme: "light" | "dark"
  setTheme: (theme: Theme) => void
  background: BackgroundPalette
  setBackground: (palette: BackgroundPalette) => void
  /** Builds a palette from one picked colour and applies it. */
  setCustomBackground: (hex: string) => void
  resetBackground: () => void
}

const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined)

const BG_STORAGE_KEY = "ac-controller-background"

function isHex(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value)
}

function getStoredBackground(): BackgroundPalette {
  if (typeof window === "undefined") return DEFAULT_BACKGROUND
  try {
    const raw = window.localStorage.getItem(BG_STORAGE_KEY)
    if (!raw) return DEFAULT_BACKGROUND
    const parsed = JSON.parse(raw) as Partial<BackgroundPalette>
    if (isHex(parsed.a) && isHex(parsed.b) && isHex(parsed.base)) {
      return {
        id: typeof parsed.id === "string" ? parsed.id : "custom",
        label: typeof parsed.label === "string" ? parsed.label : "Custom",
        a: parsed.a,
        b: parsed.b,
        base: parsed.base,
      }
    }
  } catch {
    // Corrupt value: fall through to the default.
  }
  return DEFAULT_BACKGROUND
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")
  return `#${c(r)}${c(g)}${c(b)}`
}

/** Mixes `hex` toward `target` by `amount` (0..1). */
function mix(hex: string, target: [number, number, number], amount: number): string {
  const [r, g, b] = hexToRgb(hex)
  return rgbToHex(r + (target[0] - r) * amount, g + (target[1] - g) * amount, b + (target[2] - b) * amount)
}

/** Rotates the hue of a colour by swapping channel weight, a cheap way to
 * get a related-but-different second glow without a full HSL round trip. */
function shifted(hex: string): string {
  const [r, g, b] = hexToRgb(hex)
  return rgbToHex(b * 0.6 + r * 0.4, r * 0.5 + g * 0.5, g * 0.6 + b * 0.4)
}

/** Keeps a picked colour in the "glow" range: never near-white (text would
 * vanish) and never pure black (no glow at all). */
function toGlow(hex: string): string {
  const [r, g, b] = hexToRgb(hex)
  const max = Math.max(r, g, b)
  if (max > 150) return rgbToHex((r * 150) / max, (g * 150) / max, (b * 150) / max)
  if (max < 40) return mix(hex, [40, 40, 50], 0.5)
  return hex
}

export function paletteFromColor(hex: string): BackgroundPalette {
  const a = toGlow(hex)
  return {
    id: "custom",
    label: "Custom",
    a,
    b: toGlow(shifted(a)),
    base: mix(a, [2, 4, 8], 0.93),
  }
}

function applyBackground(p: BackgroundPalette) {
  const root = document.documentElement.style
  root.setProperty("--bg-a", p.a)
  root.setProperty("--bg-b", p.b)
  root.setProperty("--bg-base", p.base)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute("content", p.base)
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [background, setBackgroundState] = React.useState<BackgroundPalette>(getStoredBackground)

  React.useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove("light")
    root.classList.add("dark")
    root.style.colorScheme = "dark"
  }, [])

  React.useEffect(() => {
    applyBackground(background)
  }, [background])

  const setBackground = React.useCallback((palette: BackgroundPalette) => {
    window.localStorage.setItem(BG_STORAGE_KEY, JSON.stringify(palette))
    setBackgroundState(palette)
  }, [])

  const setCustomBackground = React.useCallback(
    (hex: string) => {
      if (isHex(hex)) setBackground(paletteFromColor(hex))
    },
    [setBackground]
  )

  const resetBackground = React.useCallback(() => {
    window.localStorage.removeItem(BG_STORAGE_KEY)
    setBackgroundState(DEFAULT_BACKGROUND)
  }, [])

  // Kept so older callers (Settings form, command palette) still compile.
  const setTheme = React.useCallback((_theme: Theme) => {}, [])

  const value = React.useMemo<ThemeContextValue>(
    () => ({
      theme: "dark",
      resolvedTheme: "dark",
      setTheme,
      background,
      setBackground,
      setCustomBackground,
      resetBackground,
    }),
    [setTheme, background, setBackground, setCustomBackground, resetBackground]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = React.useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider")
  return ctx
}
