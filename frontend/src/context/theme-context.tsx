import * as React from "react"

type Theme = "light" | "dark" | "system"

interface ThemeContextValue {
  theme: Theme
  resolvedTheme: "light" | "dark"
  setTheme: (theme: Theme) => void
}

const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined)

/**
 * The app ships a single light (beige/white/blue) design. The provider's API
 * is kept so existing consumers keep compiling, but it always resolves to
 * light and ignores OS dark mode / any previously stored preference.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove("dark")
    root.classList.add("light")
    root.style.colorScheme = "light"
    try {
      window.localStorage.removeItem("ac-controller-theme")
    } catch {
      // storage unavailable (private mode) -- nothing to clean up
    }
  }, [])

  const value = React.useMemo<ThemeContextValue>(
    () => ({ theme: "light", resolvedTheme: "light", setTheme: () => {} }),
    []
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = React.useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider")
  return ctx
}
