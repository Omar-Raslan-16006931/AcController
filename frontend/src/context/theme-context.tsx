import * as React from "react"

type Theme = "light" | "dark" | "system"

interface ThemeContextValue {
  theme: Theme
  resolvedTheme: "light" | "dark"
  setTheme: (theme: Theme) => void
}

const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined)

/**
 * The app ships a single dark design. The provider API is kept so existing
 * consumers compile, but it always resolves to dark and ignores OS
 * appearance and any previously stored preference.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove("light")
    root.classList.add("dark")
    root.style.colorScheme = "dark"
    try {
      window.localStorage.removeItem("ac-controller-theme")
    } catch {
      // storage unavailable (private mode) -- nothing to clean up
    }
  }, [])

  const value = React.useMemo<ThemeContextValue>(
    () => ({ theme: "dark", resolvedTheme: "dark", setTheme: () => {} }),
    []
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = React.useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider")
  return ctx
}
