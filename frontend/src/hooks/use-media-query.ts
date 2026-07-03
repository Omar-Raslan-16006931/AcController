import * as React from "react"

export function useMediaQuery(query: string) {
  const [matches, setMatches] = React.useState(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false
  )

  React.useEffect(() => {
    const mql = window.matchMedia(query)
    const listener = (e: MediaQueryListEvent) => setMatches(e.matches)
    mql.addEventListener("change", listener)
    setMatches(mql.matches)
    return () => mql.removeEventListener("change", listener)
  }, [query])

  return matches
}
